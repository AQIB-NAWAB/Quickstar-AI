import type { PlatformEventEnvelope } from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { WorkflowDefinition } from "../domain/types.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";
import { executeAction } from "./actions.js";
import { evaluateConditionGroup } from "./conditions.js";

export type RunnerOptions = {
  repo: WorkflowsRepository;
  logger: Logger;
  allowHttpWebhooks: boolean;
  webhookTimeoutMs: number;
};

export class WorkflowRunner {
  constructor(private readonly options: RunnerOptions) {}

  async handleEvent(envelope: PlatformEventEnvelope): Promise<void> {
    const { repo, logger } = this.options;
    const workflows = await repo.listActiveByTrigger(envelope.workspace_id, envelope.type);
    if (workflows.length === 0) {
      await repo.markEventProcessed(envelope.event_id, envelope.workspace_id);
      return;
    }

    for (const workflow of workflows) {
      try {
        await this.runWorkflow(workflow, envelope);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        logger.error("workflow.run_failed", {
          workflow_id: workflow.id,
          event_id: envelope.event_id,
          error: message,
        });
        await repo.insertDeadLetter({
          workspaceId: envelope.workspace_id,
          eventId: envelope.event_id,
          eventType: envelope.type,
          payload: envelope as unknown as Record<string, unknown>,
          errorMessage: message,
        });
      }
    }

    await repo.markEventProcessed(envelope.event_id, envelope.workspace_id);
  }

  private async runWorkflow(
    workflow: WorkflowDefinition,
    envelope: PlatformEventEnvelope,
  ): Promise<void> {
    const { repo } = this.options;
    const eventData = envelope.data ?? {};
    const stepsTotal = 1 + workflow.actions.length;

    const client = await repo.beginClient();
    let runId: string | null = null;
    let alreadyDone = false;
    try {
      await client.query("BEGIN");
      const run = await repo.tryCreateRun(client, {
        workspaceId: workflow.workspaceId,
        workflowId: workflow.id,
        definitionVersion: workflow.version,
        eventId: envelope.event_id,
        triggerEventType: envelope.type,
        eventPayload: eventData,
        stepsTotal,
      });

      if (!run) {
        await client.query("COMMIT");
        return;
      }

      if (run.status === "succeeded" || run.status === "skipped" || run.status === "failed") {
        alreadyDone = true;
        await client.query("COMMIT");
        return;
      }

      runId = run.id;
      const condition = evaluateConditionGroup(workflow.conditionGroup, eventData);
      await repo.upsertStep(client, {
        runId: run.id,
        workspaceId: workflow.workspaceId,
        stepIndex: 0,
        stepId: "condition",
        stepName: "Conditions",
        kind: "condition",
        status: condition.matched ? "succeeded" : "skipped",
        summary: condition.detail,
        inputs: { conditionGroup: workflow.conditionGroup },
        output: { matched: condition.matched },
        durationMs: 0,
      });

      if (!condition.matched) {
        await repo.updateRunProgress(client, {
          runId: run.id,
          status: "skipped",
          currentStepIndex: 0,
          stepsCompleted: 1,
          complete: true,
        });
        await client.query("COMMIT");
        return;
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (alreadyDone || !runId) {
      return;
    }

    let stepIndex = 1;
    for (const action of workflow.actions) {
      const started = Date.now();
      const markRunning = await repo.beginClient();
      try {
        await markRunning.query("BEGIN");
        await repo.upsertStep(markRunning, {
          runId,
          workspaceId: workflow.workspaceId,
          stepIndex,
          stepId: action.id,
          stepName: action.displayName || action.kind,
          kind: action.kind,
          status: "running",
          summary: "Running",
          inputs: { kind: action.kind, config: redactActionConfig(action.config) },
        });
        await markRunning.query("COMMIT");
      } catch (error) {
        await markRunning.query("ROLLBACK");
        throw error;
      } finally {
        markRunning.release();
      }

      try {
        const execClient = await repo.beginClient();
        try {
          await execClient.query("BEGIN");
          const result = await executeAction(action, {
            repo,
            client: execClient,
            workspaceId: workflow.workspaceId,
            runId,
            eventId: envelope.event_id,
            eventData,
            allowHttpWebhooks: this.options.allowHttpWebhooks,
            webhookTimeoutMs: this.options.webhookTimeoutMs,
          });
          await repo.upsertStep(execClient, {
            runId,
            workspaceId: workflow.workspaceId,
            stepIndex,
            stepId: action.id,
            stepName: action.displayName || action.kind,
            kind: action.kind,
            status: "succeeded",
            summary: result.summary,
            inputs: { kind: action.kind, config: redactActionConfig(action.config) },
            output: result.output,
            durationMs: Date.now() - started,
          });
          await repo.updateRunProgress(execClient, {
            runId,
            status: "running",
            currentStepIndex: stepIndex,
            stepsCompleted: stepIndex + 1,
          });
          await execClient.query("COMMIT");
        } catch (error) {
          await execClient.query("ROLLBACK");
          throw error;
        } finally {
          execClient.release();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Action failed";
        const failClient = await repo.beginClient();
        try {
          await failClient.query("BEGIN");
          await repo.upsertStep(failClient, {
            runId,
            workspaceId: workflow.workspaceId,
            stepIndex,
            stepId: action.id,
            stepName: action.displayName || action.kind,
            kind: action.kind,
            status: "failed",
            summary: message,
            inputs: { kind: action.kind, config: redactActionConfig(action.config) },
            error: { message },
            durationMs: Date.now() - started,
          });
          await repo.updateRunProgress(failClient, {
            runId,
            status: "failed",
            currentStepIndex: stepIndex,
            stepsCompleted: stepIndex,
            error: { message, step_id: action.id },
            complete: true,
          });
          await failClient.query("COMMIT");
        } catch (persistError) {
          await failClient.query("ROLLBACK");
          throw persistError;
        } finally {
          failClient.release();
        }
        throw error;
      }

      stepIndex += 1;
    }

    const doneClient = await repo.beginClient();
    try {
      await doneClient.query("BEGIN");
      await repo.updateRunProgress(doneClient, {
        runId,
        status: "succeeded",
        currentStepIndex: Math.max(0, workflow.actions.length),
        stepsCompleted: stepsTotal,
        complete: true,
      });
      await doneClient.query("COMMIT");
    } catch (error) {
      await doneClient.query("ROLLBACK");
      throw error;
    } finally {
      doneClient.release();
    }
  }
}

function redactActionConfig(config: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...config };
  for (const key of Object.keys(copy)) {
    const lower = key.toLowerCase();
    if (lower.includes("secret") || lower.includes("token") || lower.includes("authorization")) {
      copy[key] = "[REDACTED]";
    }
  }
  return copy;
}
