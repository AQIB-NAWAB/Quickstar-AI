import type { PlatformEventEnvelope } from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { WorkflowDefinition, WorkflowAction } from "../domain/types.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";
import { executeAction } from "./actions.js";
import { evaluateConditionGroup } from "./conditions.js";

export type RunnerOptions = {
  repo: WorkflowsRepository;
  logger: Logger;
  allowHttpWebhooks: boolean;
  webhookTimeoutMs: number;
  workspaceUrl?: string;
  conversationUrl?: string;
  secretsUrl?: string;
  leadUrl?: string;
  internalToken?: string;
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
    const eventData: Record<string, any> = { ...envelope.data, steps: {} };

    // If graph is present in draftGraph, use graph execution engine
    if (workflow.draftGraph && workflow.draftGraph.nodes && workflow.draftGraph.nodes.length > 0) {
      await this.runGraphWorkflow(workflow, envelope);
      return;
    }

    // Fallback: Linear execution for legacy workflows
    await this.runLinearWorkflow(workflow, envelope, eventData);
  }

  private async runGraphWorkflow(
    workflow: WorkflowDefinition,
    envelope: PlatformEventEnvelope,
  ): Promise<void> {
    const { repo } = this.options;
    const graph = workflow.draftGraph!;
    const eventData: Record<string, any> = { ...envelope.data, steps: {} };
    const trigger = graph.nodes.find((n) => n.id === graph.entry_node_id)?.config as
      Record<string, any> | undefined;
    if (!trigger || trigger.event_type !== envelope.type) return;
    const message = eventData.message as Record<string, unknown> | undefined;
    const sender = message?.sender_type ?? message?.role ?? eventData.sender_type;
    if (
      envelope.type === "message.appended" &&
      trigger.run_for !== "all_messages" &&
      !["visitor", "user"].includes(String(sender))
    )
      return;
    if (
      trigger.ignore_workflow_generated !== false &&
      (eventData.workflow_run_id ||
        (eventData.metadata as Record<string, unknown> | undefined)?.workflow_run_id)
    )
      return;
    if (
      trigger.agent_scope &&
      trigger.agent_scope !== "all" &&
      trigger.agent_scope !== eventData.agent_id
    )
      return;
    const channel = String(
      eventData.channel ??
        (eventData.metadata as Record<string, unknown> | undefined)?.channel ??
        "",
    );
    if (
      trigger.channel_scope &&
      trigger.channel_scope !== "all" &&
      trigger.channel_scope !== channel
    )
      return;
    const stepsTotal = graph.nodes.length;

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
        versionId: workflow.activeVersionId,
        definitionSnapshot: workflow as unknown as Record<string, unknown>,
      });

      if (!run || !run.created) {
        await client.query("COMMIT");
        return;
      }

      if (run.status === "succeeded" || run.status === "skipped" || run.status === "failed") {
        alreadyDone = true;
        await client.query("COMMIT");
        return;
      }

      runId = run.id;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (alreadyDone || !runId) return;

    type OutgoingEdge = { target: string; sourcePort: string };
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const outgoingEdges = new Map<string, OutgoingEdge[]>();
    for (const edge of graph.edges) {
      const list = outgoingEdges.get(edge.source) || [];
      list.push({ target: edge.target, sourcePort: edge.sourcePort });
      outgoingEdges.set(edge.source, list);
    }

    let currentNodeId: string | undefined = graph.entry_node_id;
    let stepIndex = 0;
    let runStatus: "succeeded" | "failed" | "skipped" = "succeeded";
    const MAX_CYCLES = 50;

    const deadline =
      Date.now() +
      Math.min(300, Math.max(1, workflow.settings?.max_run_duration_seconds ?? 60)) * 1000;
    while (currentNodeId && stepIndex < MAX_CYCLES) {
      if (await repo.isRunCanceled(workflow.workspaceId, runId)) return;
      if (Date.now() > deadline) {
        runStatus = "failed";
        break;
      }
      const node = nodeMap.get(currentNodeId);
      if (!node) {
        runStatus = "failed";
        break;
      }

      const started = Date.now();
      const nodeEdges: OutgoingEdge[] = outgoingEdges.get(currentNodeId) || [];
      const cfg = (node.config || {}) as Record<string, any>;

      // Mark step running
      const runningClient = await repo.beginClient();
      try {
        await runningClient.query("BEGIN");
        await repo.upsertStep(runningClient, {
          runId,
          workspaceId: workflow.workspaceId,
          stepIndex,
          stepId: node.id,
          stepName: node.name,
          kind: node.type,
          status: "running",
          summary: "Executing step",
          inputs: { type: node.type, config: redactConfig(cfg) },
        });
        await runningClient.query("COMMIT");
      } catch (err) {
        await runningClient.query("ROLLBACK");
        throw err;
      } finally {
        runningClient.release();
      }

      let stepResultStatus: "succeeded" | "failed" | "skipped" = "succeeded";
      let summary = "";
      let outputs: Record<string, unknown> = {};
      let nextPort = "success";
      let stepError: Record<string, unknown> | null = null;

      try {
        if (node.type === "trigger") {
          nextPort = "received";
          summary = `Trigger received: ${cfg.event_type || envelope.type}`;
          outputs = { event_id: envelope.event_id, type: envelope.type };
        } else if (node.type === "condition") {
          const evalRes = evaluateConditionGroup(cfg.root_group, eventData, {
            caseSensitive: cfg.case_sensitive ?? false,
            missingValueBehavior:
              cfg.missing_value_behavior === "error" ? "error" : "treat_as_false",
          });
          if (evalRes.matched) {
            nextPort = "matched";
            summary = evalRes.detail;
            outputs = { matched: true, details: evalRes.detail };
          } else {
            nextPort = "not_matched";
            stepResultStatus = "succeeded";
            summary = evalRes.detail;
            outputs = { matched: false, details: evalRes.detail };
          }
        } else if (node.type === "end") {
          summary = `Workflow reached end: ${cfg.reason || "completed"}`;
          outputs = { reason: cfg.reason || "completed" };
          nextPort = "";
        } else {
          // Action nodes: webhook, agent_handoff, notification, update_tags, log
          const execClient = await repo.beginClient();
          try {
            const act: WorkflowAction = {
              id: node.id,
              kind: node.type as any,
              displayName: node.name,
              config: cfg,
            };
            const result = await executeAction(act, {
              repo,
              client: execClient,
              workspaceId: workflow.workspaceId,
              runId,
              eventId: envelope.event_id,
              eventData,
              allowHttpWebhooks: this.options.allowHttpWebhooks,
              webhookTimeoutMs: this.options.webhookTimeoutMs,
              workspaceUrl: this.options.workspaceUrl,
              conversationUrl: this.options.conversationUrl,
              secretsUrl: this.options.secretsUrl,
              leadUrl: this.options.leadUrl,
              internalToken: this.options.internalToken,
            });

            summary = result.summary;
            outputs = result.output;
            nextPort = node.type === "log" ? "next" : "success";
          } catch (actErr) {
            throw actErr;
          } finally {
            execClient.release();
          }
        }
      } catch (err) {
        stepResultStatus = "failed";
        summary = err instanceof Error ? err.message : "Step execution failed";
        stepError = { message: summary };
        nextPort = "error";
      }

      (eventData.steps as Record<string, unknown>)[node.id] = { output: outputs };
      // Record step completion
      const finishClient = await repo.beginClient();
      try {
        await finishClient.query("BEGIN");
        await repo.upsertStep(finishClient, {
          runId,
          workspaceId: workflow.workspaceId,
          stepIndex,
          stepId: node.id,
          stepName: node.name,
          kind: node.type,
          status: stepResultStatus,
          summary,
          inputs: { type: node.type, config: redactConfig(cfg) },
          output: outputs,
          error: stepError ?? undefined,
          durationMs: Date.now() - started,
        });

        await repo.updateRunProgress(finishClient, {
          runId,
          status: stepResultStatus === "failed" ? "running" : "running",
          currentStepIndex: stepIndex,
          stepsCompleted: stepIndex + 1,
        });
        await finishClient.query("COMMIT");
      } catch (err) {
        await finishClient.query("ROLLBACK");
        throw err;
      } finally {
        finishClient.release();
      }

      if (stepResultStatus === "failed") {
        const errorEdge =
          cfg.failure_handling === "stop" || workflow.settings?.default_failure_handling === "stop"
            ? undefined
            : nodeEdges.find((e) => e.sourcePort === "error");
        if (errorEdge) {
          currentNodeId = errorEdge.target;
          stepIndex++;
          continue;
        } else {
          runStatus = "failed";
          break;
        }
      }

      if (node.type === "end") {
        break;
      }

      const matchingEdge = nodeEdges.find((e) => e.sourcePort === nextPort);

      if (!matchingEdge) {
        runStatus = node.type === "condition" && nextPort === "not_matched" ? "skipped" : "failed";
        break;
      }

      currentNodeId = matchingEdge.target;
      stepIndex++;
    }

    if (stepIndex >= MAX_CYCLES && currentNodeId) runStatus = "failed";
    // Finalize run
    const doneClient = await repo.beginClient();
    try {
      await doneClient.query("BEGIN");
      await repo.updateRunProgress(doneClient, {
        runId,
        status: runStatus,
        currentStepIndex: stepIndex,
        stepsCompleted: stepIndex + 1,
        complete: true,
      });
      await doneClient.query("COMMIT");
    } catch (err) {
      await doneClient.query("ROLLBACK");
      throw err;
    } finally {
      doneClient.release();
    }
  }

  private async runLinearWorkflow(
    workflow: WorkflowDefinition,
    envelope: PlatformEventEnvelope,
    eventData: Record<string, unknown>,
  ): Promise<void> {
    const { repo } = this.options;
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
        versionId: workflow.activeVersionId,
        definitionSnapshot: workflow as unknown as Record<string, unknown>,
      });

      if (!run || !run.created) {
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
          inputs: { kind: action.kind, config: redactConfig(action.config) },
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
            workspaceUrl: this.options.workspaceUrl,
            conversationUrl: this.options.conversationUrl,
            secretsUrl: this.options.secretsUrl,
            leadUrl: this.options.leadUrl,
            internalToken: this.options.internalToken,
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
            inputs: { kind: action.kind, config: redactConfig(action.config) },
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
            inputs: { kind: action.kind, config: redactConfig(action.config) },
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

function redactConfig(config: Record<string, unknown>): Record<string, unknown> {
  function redact(value: unknown, depth = 0): unknown {
    if (depth > 12) return "[TRUNCATED]";
    if (Array.isArray(value)) return value.slice(0, 100).map((v) => redact(v, depth + 1));
    if (
      value &&
      typeof value === "object" &&
      "key" in value &&
      /authorization|cookie|token|password/i.test(String(value.key))
    )
      return { ...value, value: "[REDACTED]" };
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          /secret|token|password|authorization|cookie/i.test(key)
            ? "[REDACTED]"
            : redact(v, depth + 1),
        ]),
      );
    return value;
  }
  return redact(config) as Record<string, unknown>;
}
