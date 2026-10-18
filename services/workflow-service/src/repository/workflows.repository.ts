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
  WorkflowVersionRecord,
} from "../domain/types.js";
import { convertLinearToGraph, DEFAULT_WORKFLOW_SETTINGS } from "../domain/types.js";
import type { WorkflowGraph, WorkflowSettings, WorkflowStatsSummary } from "@quickstart/contracts";

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
  draft_graph?: WorkflowGraph | null;
  draft_revision?: number;
  settings?: WorkflowSettings | null;
  active_version_id?: string | null;
  active_version_number?: number | null;
  created_at: Date;
  updated_at: Date;
};

function mapDefinition(row: DefinitionRow): WorkflowDefinition {
  const actions = Array.isArray(row.actions) ? row.actions : [];
  const triggerEventType = row.trigger_event_type;
  const conditionGroup = row.condition_group;
  const draftGraph =
    row.draft_graph ??
    convertLinearToGraph({
      id: row.id,
      name: row.name,
      triggerEventType,
      conditionGroup,
      actions,
    });

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerEventType,
    conditionGroup,
    actions,
    version: row.version,
    draftGraph,
    draftRevision: row.draft_revision ?? row.version ?? 1,
    settings: row.settings ?? DEFAULT_WORKFLOW_SETTINGS,
    activeVersionId: row.active_version_id ?? null,
    activeVersionNumber:
      row.active_version_number ?? (row.status === "active" ? row.version : null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateWorkflowInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  triggerEventType?: string;
  conditionGroup?: ConditionGroup | null;
  actions?: WorkflowAction[];
  draftGraph?: WorkflowGraph | null;
  settings?: WorkflowSettings;
  status?: WorkflowStatus;
};

export type SaveDraftInput = {
  workspaceId: string;
  workflowId: string;
  expectedRevision: number;
  name?: string;
  description?: string | null;
  triggerEventType?: string;
  draftGraph?: WorkflowGraph | null;
  settings?: WorkflowSettings;
};

export type ActivateWorkflowInput = {
  workspaceId: string;
  workflowId: string;
  expectedRevision: number;
  activatedByUserId?: string | null;
  maxActive?: number;
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
  draftGraph?: WorkflowGraph | null;
  settings?: WorkflowSettings;
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
      draft_revision: number;
      active_version_number: number | null;
      last_triggered_at: Date | null;
      success_rate_7d: string | null;
    }>(
      `SELECT d.id, d.workspace_id, d.name, d.description, d.status, d.trigger_event_type,
              d.created_at, d.updated_at, d.draft_revision, d.active_version_number,
              (
                SELECT MAX(r.triggered_at) FROM workflow_runs r
                WHERE r.workflow_id = d.id AND r.workspace_id = d.workspace_id
              ) AS last_triggered_at,
              (
                SELECT CASE
                  WHEN COUNT(*) FILTER (WHERE r.status IN ('succeeded','failed')) = 0 THEN NULL
                  ELSE ROUND(
                    100.0 * COUNT(*) FILTER (WHERE r.status = 'succeeded')
                    / NULLIF(COUNT(*) FILTER (WHERE r.status IN ('succeeded','failed')), 0)
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
      draftRevision: Number(row.draft_revision ?? 1),
      activeVersionNumber:
        row.active_version_number !== null && row.active_version_number !== undefined
          ? Number(row.active_version_number)
          : null,
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
    const draftGraph = input.draftGraph ?? null;
    const settings = input.settings ?? DEFAULT_WORKFLOW_SETTINGS;
    const triggerType =
      input.triggerEventType ||
      (draftGraph?.nodes.find((n) => n.type === "trigger")?.config?.event_type as string) ||
      "message.appended";

    const { rows } = await this.pool.query<DefinitionRow>(
      `INSERT INTO workflow_definitions (
         id, workspace_id, name, description, status, trigger_event_type,
         condition_group, actions, version, draft_graph, settings, draft_revision
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,1,$9::jsonb,$10::jsonb,1)
       RETURNING *`,
      [
        id,
        input.workspaceId,
        input.name,
        input.description ?? null,
        input.status ?? "draft",
        triggerType,
        JSON.stringify(input.conditionGroup ?? null),
        JSON.stringify(input.actions ?? []),
        JSON.stringify(draftGraph),
        JSON.stringify(settings),
      ],
    );
    return mapDefinition(rows[0]!);
  }

  async saveDraft(input: SaveDraftInput): Promise<WorkflowDefinition> {
    const current = await this.get(input.workspaceId, input.workflowId);
    if (!current) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    if (current.draftRevision !== input.expectedRevision) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Workflow draft was modified by another request; reload and retry",
      });
    }

    const nextGraph = input.draftGraph !== undefined ? input.draftGraph : current.draftGraph;
    const nextSettings = input.settings !== undefined ? input.settings : current.settings;
    const nextTrigger =
      input.triggerEventType ??
      (nextGraph?.nodes.find((n) => n.type === "trigger")?.config?.event_type as string) ??
      current.triggerEventType;

    const { rows } = await this.pool.query<DefinitionRow>(
      `UPDATE workflow_definitions SET
         name = $3,
         description = $4,
         trigger_event_type = $5,
         draft_graph = $6::jsonb,
         settings = $7::jsonb,
         draft_revision = draft_revision + 1,
         updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND draft_revision = $8
       RETURNING *`,
      [
        input.workflowId,
        input.workspaceId,
        input.name ?? current.name,
        input.description !== undefined ? input.description : current.description,
        nextTrigger,
        JSON.stringify(nextGraph),
        JSON.stringify(nextSettings),
        input.expectedRevision,
      ],
    );

    if (!rows[0]) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Workflow draft was modified by another request; reload and retry",
      });
    }
    return mapDefinition(rows[0]);
  }

  async activate(
    input: ActivateWorkflowInput,
  ): Promise<{ workflow: WorkflowDefinition; version: WorkflowVersionRecord }> {
    const current = await this.get(input.workspaceId, input.workflowId);
    if (!current) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    if (current.draftRevision !== input.expectedRevision) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Workflow draft was modified since validation; reload and retry",
      });
    }

    if (!current.draftGraph) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot activate a workflow without a valid draft graph.",
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [input.workspaceId]);
      if (input.maxActive) {
        const count = await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM workflow_definitions WHERE workspace_id=$1 AND status='active' AND deleted_at IS NULL AND id<>$2`,
          [input.workspaceId, input.workflowId],
        );
        if (Number(count.rows[0]?.count ?? 0) >= input.maxActive)
          throw new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "Workspace active workflow limit reached",
          });
      }
      const locked = await client.query<DefinitionRow>(
        `SELECT * FROM workflow_definitions WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL FOR UPDATE`,
        [input.workflowId, input.workspaceId],
      );
      if (!locked.rows[0] || locked.rows[0].draft_revision !== input.expectedRevision)
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Workflow changed since validation",
        });
      // The prevalidated snapshot can only be used while that same revision is locked.
      const verRes = await client.query<{ max_ver: number | null }>(
        `SELECT MAX(version_number) AS max_ver FROM workflow_versions WHERE workflow_id = $1`,
        [input.workflowId],
      );
      const nextVerNumber = (verRes.rows[0]?.max_ver ?? 0) + 1;
      const versionId = randomUUID();

      const versionRes = await client.query<{
        id: string;
        workspace_id: string;
        workflow_id: string;
        version_number: number;
        definition_snapshot: any;
        settings_snapshot: any;
        graph_snapshot: any;
        activated_at: Date;
        activated_by_user_id: string | null;
      }>(
        `INSERT INTO workflow_versions (
           id, workspace_id, workflow_id, version_number,
           definition_snapshot, settings_snapshot, graph_snapshot,
           activated_at, activated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,NOW(),$8)
         RETURNING *`,
        [
          versionId,
          input.workspaceId,
          input.workflowId,
          nextVerNumber,
          JSON.stringify(current),
          JSON.stringify(current.settings),
          JSON.stringify(current.draftGraph),
          input.activatedByUserId ?? null,
        ],
      );

      const updateRes = await client.query<DefinitionRow>(
        `UPDATE workflow_definitions SET
           status = 'active',
           active_version_id = $3,
           active_version_number = $4,
           version = $4,
           updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [input.workflowId, input.workspaceId, versionId, nextVerNumber],
      );

      await client.query("COMMIT");

      const vRow = versionRes.rows[0]!;
      const versionRecord: WorkflowVersionRecord = {
        id: vRow.id,
        workspaceId: vRow.workspace_id,
        workflowId: vRow.workflow_id,
        versionNumber: vRow.version_number,
        definitionSnapshot: vRow.definition_snapshot,
        settingsSnapshot: vRow.settings_snapshot,
        graphSnapshot: vRow.graph_snapshot,
        activatedAt: vRow.activated_at.toISOString(),
        activatedByUserId: vRow.activated_by_user_id,
      };

      return {
        workflow: mapDefinition(updateRes.rows[0]!),
        version: versionRecord,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async pause(workspaceId: string, workflowId: string): Promise<WorkflowDefinition> {
    const { rows } = await this.pool.query<DefinitionRow>(
      `UPDATE workflow_definitions SET
         status = 'paused',
         updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [workflowId, workspaceId],
    );
    if (!rows[0]) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    return mapDefinition(rows[0]);
  }

  async getStats(workspaceId: string): Promise<WorkflowStatsSummary> {
    const wfRes = await this.pool.query<{
      total: string;
      active: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'active')::text AS active
       FROM workflow_definitions
       WHERE workspace_id = $1 AND deleted_at IS NULL`,
      [workspaceId],
    );

    const runsRes = await this.pool.query<{
      today_count: string;
      yesterday_count: string;
      succeeded_7d: string;
      eligible_7d: string;
      needs_attention: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE triggered_at >= CURRENT_DATE)::text AS today_count,
         COUNT(*) FILTER (WHERE triggered_at >= CURRENT_DATE - INTERVAL '1 day' AND triggered_at < CURRENT_DATE)::text AS yesterday_count,
         COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '7 days' AND status = 'succeeded')::text AS succeeded_7d,
         COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '7 days' AND status IN ('succeeded', 'failed'))::text AS eligible_7d,
         COUNT(DISTINCT workflow_id) FILTER (WHERE triggered_at >= NOW() - INTERVAL '7 days' AND status = 'failed')::text AS needs_attention
       FROM workflow_runs
       WHERE workspace_id = $1 AND mode = 'live'`,
      [workspaceId],
    );

    const total = Number(wfRes.rows[0]?.total ?? 0);
    const active = Number(wfRes.rows[0]?.active ?? 0);
    const runsToday = Number(runsRes.rows[0]?.today_count ?? 0);
    const runsYesterday = Number(runsRes.rows[0]?.yesterday_count ?? 0);
    const deltaPct =
      runsYesterday === 0
        ? runsToday > 0
          ? 100
          : 0
        : Math.round(((runsToday - runsYesterday) / runsYesterday) * 100);

    const succ7d = Number(runsRes.rows[0]?.succeeded_7d ?? 0);
    const elig7d = Number(runsRes.rows[0]?.eligible_7d ?? 0);
    const successRate = elig7d > 0 ? Math.round((succ7d / elig7d) * 1000) / 10 : null;
    const needsAttention = Number(runsRes.rows[0]?.needs_attention ?? 0);

    return {
      active_workflows: active,
      total_workflows: total,
      runs_today: runsToday,
      runs_yesterday_delta_pct: deltaPct,
      success_rate_7d: successRate,
      needs_attention_count: needsAttention,
    };
  }

  async update(input: UpdateWorkflowInput): Promise<WorkflowDefinition> {
    const current = await this.get(input.workspaceId, input.workflowId);
    if (!current) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Workflow not found" });
    }
    if (
      current.version !== input.expectedVersion &&
      current.draftRevision !== input.expectedVersion
    ) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Workflow was updated by another request; reload and retry",
      });
    }

    const nextStatus = input.status ?? current.status;
    const bumpVersion =
      nextStatus === "active" ||
      input.actions !== undefined ||
      input.triggerEventType !== undefined;

    const { rows } = await this.pool.query<DefinitionRow>(
      `UPDATE workflow_definitions SET
         name = $3,
         description = $4,
         status = $5,
         trigger_event_type = $6,
         condition_group = $7::jsonb,
         actions = $8::jsonb,
         draft_graph = COALESCE($11::jsonb, draft_graph),
         settings = COALESCE($12::jsonb, settings),
         version = CASE WHEN $9 THEN version + 1 ELSE version END,
         draft_revision = draft_revision + 1,
         updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND (version = $10 OR draft_revision = $10)
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
        input.draftGraph ? JSON.stringify(input.draftGraph) : null,
        input.settings ? JSON.stringify(input.settings) : null,
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

  async claimActionOperation(
    workspaceId: string,
    runId: string,
    nodeId: string,
    operationKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ claimed: boolean; status: string; result?: Record<string, unknown> | null }> {
    const id = randomUUID();
    const res = await this.pool.query<{
      status: string;
      result: Record<string, unknown> | null;
    }>(
      `INSERT INTO workflow_action_journal (
         id, workspace_id, run_id, node_id, operation_key, status, attempts, payload
       ) VALUES ($1, $2, $3, $4, $5, 'dispatching', 1, $6::jsonb)
       ON CONFLICT (run_id, node_id, operation_key) DO UPDATE SET
         attempts = workflow_action_journal.attempts + 1,
         updated_at = NOW()
       RETURNING status, result`,
      [id, workspaceId, runId, nodeId, operationKey, JSON.stringify(payload)],
    );

    const row = res.rows[0];
    if (!row) return { claimed: false, status: "uncertain" };
    if (row.status === "succeeded") {
      return { claimed: false, status: "succeeded", result: row.result };
    }
    return { claimed: true, status: row.status };
  }

  async updateActionOperation(
    workspaceId: string,
    runId: string,
    nodeId: string,
    operationKey: string,
    status: "succeeded" | "failed" | "uncertain",
    result?: Record<string, unknown> | null,
    error?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE workflow_action_journal SET
         status = $4,
         result = $5::jsonb,
         error = $6::jsonb,
         updated_at = NOW()
       WHERE run_id = $1 AND node_id = $2 AND operation_key = $3 AND workspace_id = $7`,
      [
        runId,
        nodeId,
        operationKey,
        status,
        JSON.stringify(result ?? null),
        JSON.stringify(error ?? null),
        workspaceId,
      ],
    );
  }

  async listActiveByTrigger(
    workspaceId: string,
    triggerEventType: string,
  ): Promise<WorkflowDefinition[]> {
    const { rows } = await this.pool.query<
      DefinitionRow & {
        active_graph?: WorkflowGraph | null;
        active_settings?: WorkflowSettings | null;
      }
    >(
      `SELECT d.*, v.graph_snapshot AS active_graph, v.settings_snapshot AS active_settings
       FROM workflow_definitions d
       LEFT JOIN workflow_versions v ON v.id = d.active_version_id
       WHERE d.workspace_id = $1
         AND COALESCE(v.definition_snapshot->>'triggerEventType', d.trigger_event_type) = $2
         AND d.status = 'active'
         AND d.deleted_at IS NULL`,
      [workspaceId, triggerEventType],
    );
    return rows.map((r) => {
      const def = mapDefinition(r);
      if (r.active_graph) {
        def.draftGraph = r.active_graph;
      }
      if (r.active_settings) {
        def.settings = r.active_settings;
      }
      return def;
    });
  }

  async listVersions(workspaceId: string, workflowId: string): Promise<WorkflowVersionRecord[]> {
    const { rows } = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      version_number: number;
      definition_snapshot: any;
      settings_snapshot: any;
      graph_snapshot: any;
      activated_at: Date;
      activated_by_user_id: string | null;
    }>(
      `SELECT * FROM workflow_versions
       WHERE workspace_id = $1 AND workflow_id = $2
       ORDER BY version_number DESC`,
      [workspaceId, workflowId],
    );
    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      workflowId: r.workflow_id,
      versionNumber: r.version_number,
      definitionSnapshot: r.definition_snapshot,
      settingsSnapshot: r.settings_snapshot,
      graphSnapshot: r.graph_snapshot,
      activatedAt: r.activated_at.toISOString(),
      activatedByUserId: r.activated_by_user_id,
    }));
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
      versionId?: string | null;
      mode?: "live" | "dry_run";
      replayOfRunId?: string | null;
      definitionSnapshot?: Record<string, unknown> | null;
    },
  ): Promise<{ id: string; created: boolean; status: RunStatus; currentStepIndex: number } | null> {
    const id = randomUUID();
    const mode = input.mode ?? "live";
    const insert = await client.query<{
      id: string;
      status: RunStatus;
      current_step_index: number;
    }>(
      `INSERT INTO workflow_runs (
         id, workspace_id, workflow_id, definition_version, event_id,
         trigger_event_type, event_payload, status, current_step_index, steps_total,
         version_id, mode, replay_of_run_id, definition_snapshot
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'running',0,$8,$9,$10,$11,$12::jsonb)
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
        input.versionId ?? null,
        mode,
        input.replayOfRunId ?? null,
        input.definitionSnapshot ? JSON.stringify(input.definitionSnapshot) : null,
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
      handledErrors?: boolean;
    },
  ): Promise<void> {
    await client.query(
      `UPDATE workflow_runs SET
         status = $2,
         current_step_index = $3,
         steps_completed = $4,
         error = $5::jsonb,
         handled_errors = COALESCE($7, handled_errors),
         completed_at = CASE WHEN $6 THEN NOW() ELSE completed_at END
       WHERE id = $1 AND status <> 'canceled'`,
      [
        input.runId,
        input.status,
        input.currentStepIndex,
        input.stepsCompleted,
        JSON.stringify(input.error ?? null),
        input.complete ?? false,
        input.handledErrors ?? false,
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

  async listRuns(
    workspaceId: string,
    workflowId?: string,
    options?: {
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ runs: WorkflowRunRecord[]; total: number }> {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    const conditions: string[] = ["workspace_id = $1"];
    const params: unknown[] = [workspaceId];

    if (workflowId) {
      params.push(workflowId);
      conditions.push(`workflow_id = $${params.length}`);
    }

    if (options?.status && options.status !== "all") {
      params.push(options.status);
      conditions.push(`status = $${params.length}`);
    }

    if (options?.search && options.search.trim()) {
      params.push(`%${options.search.trim()}%`);
      conditions.push(
        `(id::text ILIKE $${params.length} OR event_payload->>'conversation_id' ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM workflow_runs WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(limit, offset);
    const { rows } = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      definition_version: number;
      version_id: string | null;
      mode: "live" | "dry_run";
      replay_of_run_id: string | null;
      status: RunStatus;
      triggered_at: Date;
      completed_at: Date | null;
      steps_completed: number;
      steps_total: number;
      handled_errors: boolean;
      definition_snapshot: Record<string, unknown> | null;
    }>(
      `SELECT id, workspace_id, workflow_id, definition_version, version_id, mode,
              replay_of_run_id, status, triggered_at, completed_at, steps_completed,
              steps_total, handled_errors, definition_snapshot
       FROM workflow_runs
       WHERE ${whereClause}
       ORDER BY triggered_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const runs: WorkflowRunRecord[] = [];
    for (const row of rows) {
      const steps = await this.listSteps(row.id);
      runs.push(this.toRunRecord(row, steps));
    }
    return { runs, total };
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
      version_id: string | null;
      mode: "live" | "dry_run";
      replay_of_run_id: string | null;
      status: RunStatus;
      triggered_at: Date;
      completed_at: Date | null;
      steps_completed: number;
      steps_total: number;
      handled_errors: boolean;
      definition_snapshot: Record<string, unknown> | null;
    }>(
      `SELECT id, workspace_id, workflow_id, definition_version, version_id, mode,
              replay_of_run_id, status, triggered_at, completed_at, steps_completed,
              steps_total, handled_errors, definition_snapshot
       FROM workflow_runs
       WHERE id = $1 AND workspace_id = $2 AND workflow_id = $3`,
      [runId, workspaceId, workflowId],
    );
    const row = rows[0];
    if (!row) return null;
    const steps = await this.listSteps(row.id);
    return this.toRunRecord(row, steps);
  }

  async isRunCanceled(workspaceId: string, runId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT status FROM workflow_runs WHERE id=$1 AND workspace_id=$2`,
      [runId, workspaceId],
    );
    return rows[0]?.status === "canceled";
  }

  async cancelRun(workspaceId: string, runId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE workflow_runs SET
         status = 'canceled',
         completed_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND status = 'running'`,
      [runId, workspaceId],
    );
    return (res.rowCount ?? 0) > 0;
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
      started_at: Date | null;
      completed_at: Date | null;
    }>(
      `SELECT step_id, step_name, kind, status, summary, duration_ms, inputs, output, error,
              started_at, completed_at
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
      startedAt: row.started_at?.toISOString(),
      completedAt: row.completed_at?.toISOString(),
    }));
  }

  private toRunRecord(
    row: {
      id: string;
      workspace_id: string;
      workflow_id: string;
      definition_version: number;
      version_id?: string | null;
      mode?: "live" | "dry_run";
      replay_of_run_id?: string | null;
      status: RunStatus;
      triggered_at: Date;
      completed_at: Date | null;
      steps_completed: number;
      steps_total: number;
      handled_errors?: boolean;
      definition_snapshot?: Record<string, unknown> | null;
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
      versionId: row.version_id ?? null,
      mode: row.mode ?? "live",
      replayOfRunId: row.replay_of_run_id ?? null,
      status: row.status,
      triggeredAt: row.triggered_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
      durationMs,
      completedSteps: row.steps_completed,
      totalSteps: row.steps_total,
      handledErrors: Boolean(row.handled_errors),
      definitionSnapshot: row.definition_snapshot,
      stepsSummary:
        row.status === "skipped"
          ? "Condition not matched"
          : row.handled_errors
            ? "Completed with handled error"
            : `${row.steps_completed} / ${row.steps_total}`,
      stepRuns: steps,
    };
  }
}
