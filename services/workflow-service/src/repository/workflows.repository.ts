import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  ConditionGroup,
  RunStatus,
  StepRunRecord,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRunRecord,
  WorkflowStatus,
} from "../domain/types.js";

type DefinitionRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  trigger_event_type: string;
  condition_group: ConditionGroup | null;
  actions: WorkflowAction[];
  version: number;
  created_at: Date;
  updated_at: Date;
};

function mapDefinition(row: DefinitionRow): WorkflowDefinition {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerEventType: row.trigger_event_type,
    conditionGroup: row.condition_group,
    actions: Array.isArray(row.actions) ? row.actions : [],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateWorkflowInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  triggerEventType: string;
  conditionGroup?: ConditionGroup | null;
  actions: WorkflowAction[];
  status?: WorkflowStatus;
};

export type UpdateWorkflowInput = {
  workspaceId: string;
  workflowId: string;
  expectedVersion: number;
  name?: string;
  description?: string | null;
  triggerEventType?: string;
  conditionGroup?: ConditionGroup | null;
  actions?: WorkflowAction[];
  status?: WorkflowStatus;
};

export class WorkflowsRepository {
  constructor(private readonly pool: Pool) {}

  async list(workspaceId: string): Promise<WorkflowListItem[]> {
    const { rows } = await this.pool.query<{
      id: string;
      workspace_id: string;
      name: string;
      description: string | null;
      status: WorkflowStatus;
      trigger_event_type: string;
      created_at: Date;
      updated_at: Date;
      last_triggered_at: Date | null;
      success_rate_7d: string | null;
    }>(
      `SELECT d.id, d.workspace_id, d.name, d.description, d.status, d.trigger_event_type,
              d.created_at, d.updated_at,
              (
                SELECT MAX(r.triggered_at) FROM workflow_runs r
                WHERE r.workflow_id = d.id AND r.workspace_id = d.workspace_id
              ) AS last_triggered_at,
              (
                SELECT CASE
                  WHEN COUNT(*) FILTER (WHERE r.status IN ('succeeded','failed','skipped')) = 0 THEN NULL
                  ELSE ROUND(
                    100.0 * COUNT(*) FILTER (WHERE r.status = 'succeeded')
                    / NULLIF(COUNT(*) FILTER (WHERE r.status IN ('succeeded','failed','skipped')), 0)
                  , 1)
                END
                FROM workflow_runs r
                WHERE r.workflow_id = d.id
                  AND r.workspace_id = d.workspace_id
                  AND r.triggered_at >= NOW() - INTERVAL '7 days'
              ) AS success_rate_7d
       FROM workflow_definitions d
       WHERE d.workspace_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.updated_at DESC`,
      [workspaceId],
    );

    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description,
      status: row.status,
      triggerEventType: row.trigger_event_type,
      lastTriggeredAt: row.last_triggered_at?.toISOString() ?? null,
      successRate7d: row.success_rate_7d === null ? null : Number(row.success_rate_7d),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async get(workspaceId: string, workflowId: string): Promise<WorkflowDefinition | null> {
    const { rows } = await this.pool.query<DefinitionRow>(
      `SELECT * FROM workflow_definitions
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [workflowId, workspaceId],
    );
    return rows[0] ? mapDefinition(rows[0]) : null;
  }

  async countActive(workspaceId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM workflow_definitions
       WHERE workspace_id = $1 AND status = 'active' AND deleted_at IS NULL`,
      [workspaceId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async create(input: CreateWorkflowInput): Promise<WorkflowDefinition> {
    const id = randomUUID();
    const { rows } = await this.pool.query<DefinitionRow>(
      `INSERT INTO workflow_definitions (
         id, workspace_id, name, description, status, trigger_event_type,
         condition_group, actions, version
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,1)
       RETURNING *`,
      [
        id,
        input.workspaceId,
        input.name,
        input.description ?? null,
        input.status ?? "draft",
        input.triggerEventType,
        JSON.stringify(input.conditionGroup ?? null),
        JSON.stringify(input.actions),
      ],
    );
    return mapDefinition(rows[0]!);
  }

  async update(input: UpdateWorkflowInput): Promise<WorkflowDefinition> {
    const current = await this.get(input.workspaceId, input.workflowId);
    if (!current) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    if (current.version !== input.expectedVersion) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Workflow was updated by another request; reload and retry",
      });
    }

    const nextStatus = input.status ?? current.status;
    const bumpVersion = nextStatus === "active" || input.actions !== undefined || input.triggerEventType !== undefined;

    const { rows } = await this.pool.query<DefinitionRow>(
      `UPDATE workflow_definitions SET
         name = $3,
         description = $4,
         status = $5,
         trigger_event_type = $6,
         condition_group = $7::jsonb,
         actions = $8::jsonb,
         version = CASE WHEN $9 THEN version + 1 ELSE version END,
         updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND version = $10
       RETURNING *`,
      [
        input.workflowId,
        input.workspaceId,
        input.name ?? current.name,
        input.description !== undefined ? input.description : current.description,
        nextStatus,
        input.triggerEventType ?? current.triggerEventType,
        JSON.stringify(
          input.conditionGroup !== undefined ? input.conditionGroup : current.conditionGroup,
        ),
        JSON.stringify(input.actions ?? current.actions),
        bumpVersion,
        input.expectedVersion,
      ],
    );
    if (!rows[0]) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Workflow was updated by another request; reload and retry",
      });
    }
    return mapDefinition(rows[0]);
  }

  async softDelete(workspaceId: string, workflowId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE workflow_definitions
       SET deleted_at = NOW(), status = 'paused', updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [workflowId, workspaceId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listActiveByTrigger(
    workspaceId: string,
    triggerEventType: string,
  ): Promise<WorkflowDefinition[]> {
    const { rows } = await this.pool.query<DefinitionRow>(
      `SELECT * FROM workflow_definitions
       WHERE workspace_id = $1
         AND trigger_event_type = $2
         AND status = 'active'
         AND deleted_at IS NULL`,
      [workspaceId, triggerEventType],
    );
    return rows.map(mapDefinition);
  }

  async beginClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async tryCreateRun(
    client: PoolClient,
    input: {
      workspaceId: string;
      workflowId: string;
      definitionVersion: number;
      eventId: string;
      triggerEventType: string;
      eventPayload: Record<string, unknown>;
      stepsTotal: number;
    },
  ): Promise<{ id: string; created: boolean; status: RunStatus; currentStepIndex: number } | null> {
    const id = randomUUID();
    const insert = await client.query<{
      id: string;
      status: RunStatus;
      current_step_index: number;
    }>(
      `INSERT INTO workflow_runs (
         id, workspace_id, workflow_id, definition_version, event_id,
         trigger_event_type, event_payload, status, current_step_index, steps_total
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'running',0,$8)
       ON CONFLICT (workflow_id, event_id) DO NOTHING
       RETURNING id, status, current_step_index`,
      [
        id,
        input.workspaceId,
        input.workflowId,
        input.definitionVersion,
        input.eventId,
        input.triggerEventType,
        JSON.stringify(input.eventPayload),
        input.stepsTotal,
      ],
    );
    if (insert.rows[0]) {
      return {
        id: insert.rows[0].id,
        created: true,
        status: insert.rows[0].status,
        currentStepIndex: insert.rows[0].current_step_index,
      };
    }

    const existing = await client.query<{
      id: string;
      status: RunStatus;
      current_step_index: number;
    }>(
      `SELECT id, status, current_step_index FROM workflow_runs
       WHERE workflow_id = $1 AND event_id = $2`,
      [input.workflowId, input.eventId],
    );
    const row = existing.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      created: false,
      status: row.status,
      currentStepIndex: row.current_step_index,
    };
  }

  async upsertStep(
    client: PoolClient,
    input: {
      runId: string;
      workspaceId: string;
      stepIndex: number;
      stepId: string;
      stepName: string;
      kind: string;
      status: RunStatus;
      summary: string;
      inputs?: Record<string, unknown> | null;
      output?: Record<string, unknown> | null;
      error?: Record<string, unknown> | null;
      durationMs?: number | null;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO workflow_run_steps (
         run_id, workspace_id, step_index, step_id, step_name, kind, status, summary,
         inputs, output, error, completed_at, duration_ms
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::text,$8,$9::jsonb,$10::jsonb,$11::jsonb,
                 CASE WHEN $7::text = 'running' THEN NULL ELSE NOW() END, $12)
       ON CONFLICT (run_id, step_id) DO UPDATE SET
         status = EXCLUDED.status,
         summary = EXCLUDED.summary,
         inputs = EXCLUDED.inputs,
         output = EXCLUDED.output,
         error = EXCLUDED.error,
         completed_at = EXCLUDED.completed_at,
         duration_ms = EXCLUDED.duration_ms`,
      [
        input.runId,
        input.workspaceId,
        input.stepIndex,
        input.stepId,
        input.stepName,
        input.kind,
        input.status,
        input.summary,
        JSON.stringify(input.inputs ?? null),
        JSON.stringify(input.output ?? null),
        JSON.stringify(input.error ?? null),
        input.durationMs ?? null,
      ],
    );
  }

  async updateRunProgress(
    client: PoolClient,
    input: {
      runId: string;
      status: RunStatus;
      currentStepIndex: number;
      stepsCompleted: number;
      error?: Record<string, unknown> | null;
      complete?: boolean;
    },
  ): Promise<void> {
    await client.query(
      `UPDATE workflow_runs SET
         status = $2,
         current_step_index = $3,
         steps_completed = $4,
         error = $5::jsonb,
         completed_at = CASE WHEN $6 THEN NOW() ELSE completed_at END
       WHERE id = $1`,
      [
        input.runId,
        input.status,
        input.currentStepIndex,
        input.stepsCompleted,
        JSON.stringify(input.error ?? null),
        input.complete ?? false,
      ],
    );
  }

  async insertSideEffect(
    client: PoolClient,
    input: {
      workspaceId: string;
      runId: string;
      eventId: string;
      stepId: string;
      effectKind: string;
      payload: Record<string, unknown>;
    },
  ): Promise<{ inserted: boolean }> {
    const result = await client.query(
      `INSERT INTO workflow_side_effects (
         workspace_id, run_id, event_id, step_id, effect_kind, payload
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (run_id, step_id) DO NOTHING`,
      [
        input.workspaceId,
        input.runId,
        input.eventId,
        input.stepId,
        input.effectKind,
        JSON.stringify(input.payload),
      ],
    );
    return { inserted: (result.rowCount ?? 0) > 0 };
  }

  async insertDeadLetter(input: {
    workspaceId: string | null;
    eventId: string | null;
    eventType: string | null;
    payload: Record<string, unknown>;
    errorMessage: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO workflow_dead_letters (
         workspace_id, event_id, event_type, payload, error_message
       ) VALUES ($1,$2,$3,$4::jsonb,$5)`,
      [
        input.workspaceId,
        input.eventId,
        input.eventType,
        JSON.stringify(input.payload),
        input.errorMessage,
      ],
    );
  }

  async markEventProcessed(eventId: string, workspaceId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO workflow_processed_events (event_id, workspace_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, workspaceId],
    );
  }

  async listRuns(workspaceId: string, workflowId: string, limit = 50): Promise<WorkflowRunRecord[]> {
    const { rows } = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      definition_version: number;
      status: RunStatus;
      triggered_at: Date;
      completed_at: Date | null;
      steps_completed: number;
      steps_total: number;
    }>(
      `SELECT id, workspace_id, workflow_id, definition_version, status,
              triggered_at, completed_at, steps_completed, steps_total
       FROM workflow_runs
       WHERE workspace_id = $1 AND workflow_id = $2
       ORDER BY triggered_at DESC
       LIMIT $3`,
      [workspaceId, workflowId, Math.min(Math.max(limit, 1), 100)],
    );

    const runs: WorkflowRunRecord[] = [];
    for (const row of rows) {
      const steps = await this.listSteps(row.id);
      runs.push(this.toRunRecord(row, steps));
    }
    return runs;
  }

  async getRun(
    workspaceId: string,
    workflowId: string,
    runId: string,
  ): Promise<WorkflowRunRecord | null> {
    const { rows } = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      definition_version: number;
      status: RunStatus;
      triggered_at: Date;
      completed_at: Date | null;
      steps_completed: number;
      steps_total: number;
    }>(
      `SELECT id, workspace_id, workflow_id, definition_version, status,
              triggered_at, completed_at, steps_completed, steps_total
       FROM workflow_runs
       WHERE id = $1 AND workspace_id = $2 AND workflow_id = $3`,
      [runId, workspaceId, workflowId],
    );
    const row = rows[0];
    if (!row) return null;
    const steps = await this.listSteps(row.id);
    return this.toRunRecord(row, steps);
  }

  private async listSteps(runId: string): Promise<StepRunRecord[]> {
    const { rows } = await this.pool.query<{
      step_id: string;
      step_name: string;
      kind: string;
      status: RunStatus;
      summary: string;
      duration_ms: number | null;
      inputs: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error: Record<string, unknown> | null;
    }>(
      `SELECT step_id, step_name, kind, status, summary, duration_ms, inputs, output, error
       FROM workflow_run_steps
       WHERE run_id = $1
       ORDER BY step_index ASC`,
      [runId],
    );
    return rows.map((row) => ({
      stepId: row.step_id,
      stepName: row.step_name,
      kind: row.kind,
      status: row.status,
      summary: row.summary,
      durationMs: row.duration_ms,
      inputs: row.inputs,
      output: row.output,
      error: row.error,
    }));
  }

  private toRunRecord(
    row: {
      id: string;
      workspace_id: string;
      workflow_id: string;
      definition_version: number;
      status: RunStatus;
      triggered_at: Date;
      completed_at: Date | null;
      steps_completed: number;
      steps_total: number;
    },
    steps: StepRunRecord[],
  ): WorkflowRunRecord {
    const durationMs =
      row.completed_at !== null
        ? Math.max(0, row.completed_at.getTime() - row.triggered_at.getTime())
        : null;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workflowId: row.workflow_id,
      definitionVersion: row.definition_version,
      status: row.status,
      triggeredAt: row.triggered_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
      durationMs,
      completedSteps: row.steps_completed,
      totalSteps: row.steps_total,
      stepsSummary:
        row.status === "skipped"
          ? "Condition not matched"
          : `${row.steps_completed} / ${row.steps_total}`,
      stepRuns: steps,
    };
  }
}
