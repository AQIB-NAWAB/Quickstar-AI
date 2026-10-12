import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { WorkflowDefinition } from "../domain/types.js";
import type { WorkflowsService } from "../services/workflows.service.js";
import { routeParam } from "../utils/route-param.js";

export const WORKFLOW_READ = WORKSPACE_PERMISSIONS.WORKFLOW_READ;
export const WORKFLOW_EDIT = WORKSPACE_PERMISSIONS.WORKFLOW_EDIT;
export const WORKFLOW_ACTIVATE = WORKSPACE_PERMISSIONS.WORKFLOW_ACTIVATE;
export const WORKFLOW_DELETE = WORKSPACE_PERMISSIONS.WORKFLOW_DELETE;
export const WORKFLOW_RUNS_READ = WORKSPACE_PERMISSIONS.WORKFLOW_RUNS_READ;

function toApiDefinition(wf: WorkflowDefinition) {
  return {
    id: wf.id,
    workspace_id: wf.workspaceId,
    name: wf.name,
    description: wf.description,
    status: wf.status,
    version: wf.version,
    trigger: {
      id: `trigger-${wf.id}`,
      event_type: wf.triggerEventType,
    },
    condition_group: wf.conditionGroup,
    actions: wf.actions.map((a) => ({
      id: a.id,
      kind: a.kind,
      display_name: a.displayName,
      config: a.config,
    })),
    created_at: wf.createdAt.toISOString(),
    updated_at: wf.updatedAt.toISOString(),
  };
}

export function createWorkflowsController(workflows: WorkflowsService) {
  return {
    list: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const items = await workflows.list(workspaceId);
      sendPlatformJson(res, 200, {
        workflows: items.map((w) => ({
          id: w.id,
          workspace_id: w.workspaceId,
          name: w.name,
          description: w.description,
          status: w.status,
          trigger_event_type: w.triggerEventType,
          last_triggered_at: w.lastTriggeredAt,
          success_rate_7d: w.successRate7d,
          created_at: w.createdAt,
          updated_at: w.updatedAt,
        })),
      });
    }) as RequestHandler,

    get: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const wf = await workflows.get(workspaceId, workflowId);
      sendPlatformJson(res, 200, { workflow: toApiDefinition(wf) });
    }) as RequestHandler,

    create: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const wf = await workflows.create(workspaceId, {
        name: typeof body.name === "string" ? body.name : undefined,
        description: (body.description as string | null | undefined) ?? null,
        trigger_event_type:
          typeof body.trigger_event_type === "string"
            ? body.trigger_event_type
            : typeof (body.trigger as { event_type?: string } | undefined)?.event_type === "string"
              ? (body.trigger as { event_type: string }).event_type
              : undefined,
        condition_group: (body.condition_group as never) ?? null,
        actions: normalizeIncomingActions(body.actions),
        status: body.status as never,
      });
      sendPlatformJson(res, 201, { workflow: toApiDefinition(wf) });
    }) as RequestHandler,

    update: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const expectedVersion =
        typeof body.expected_version === "number"
          ? body.expected_version
          : typeof body.version === "number"
            ? body.version
            : undefined;
      const wf = await workflows.update(workspaceId, workflowId, {
        expected_version: expectedVersion,
        name: typeof body.name === "string" ? body.name : undefined,
        description: body.description as string | null | undefined,
        trigger_event_type:
          typeof body.trigger_event_type === "string"
            ? body.trigger_event_type
            : typeof (body.trigger as { event_type?: string } | undefined)?.event_type === "string"
              ? (body.trigger as { event_type: string }).event_type
              : undefined,
        condition_group: body.condition_group as never,
        actions: body.actions !== undefined ? normalizeIncomingActions(body.actions) : undefined,
        status: body.status as never,
      });
      sendPlatformJson(res, 200, { workflow: toApiDefinition(wf) });
    }) as RequestHandler,

    remove: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      await workflows.delete(workspaceId, workflowId);
      sendPlatformJson(res, 200, { deleted: true });
    }) as RequestHandler,

    listRuns: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const runs = await workflows.listRuns(workspaceId, workflowId);
      sendPlatformJson(res, 200, {
        runs: runs.map(toApiRun),
      });
    }) as RequestHandler,

    getRun: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const runId = routeParam(req.params.runId);
      const run = await workflows.getRun(workspaceId, workflowId, runId);
      sendPlatformJson(res, 200, { run: toApiRun(run) });
    }) as RequestHandler,

    catalog: ((_req, res) => {
      sendPlatformJson(res, 200, { events: workflows.eventCatalog() });
    }) as RequestHandler,
  };
}

function normalizeIncomingActions(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const action = item as Record<string, unknown>;
    return {
      id: String(action.id ?? ""),
      kind: action.kind as never,
      displayName: String(action.display_name ?? action.displayName ?? action.kind ?? ""),
      config: (action.config as Record<string, unknown>) ?? {},
    };
  });
}

function toApiRun(run: {
  id: string;
  workspaceId: string;
  workflowId: string;
  definitionVersion: number;
  status: string;
  triggeredAt: string;
  completedAt: string | null;
  durationMs: number | null;
  completedSteps: number;
  totalSteps: number;
  stepsSummary: string;
  stepRuns: Array<{
    stepId: string;
    stepName: string;
    kind: string;
    status: string;
    durationMs: number | null;
    summary: string;
    inputs: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    error: Record<string, unknown> | null;
  }>;
}) {
  return {
    id: run.id,
    workspace_id: run.workspaceId,
    workflow_id: run.workflowId,
    definition_version: run.definitionVersion,
    status: run.status,
    triggered_at: run.triggeredAt,
    completed_at: run.completedAt,
    duration_ms: run.durationMs,
    completed_steps: run.completedSteps,
    total_steps: run.totalSteps,
    steps_summary: run.stepsSummary,
    step_runs: run.stepRuns.map((s) => ({
      step_id: s.stepId,
      step_name: s.stepName,
      kind: s.kind,
      status: s.status,
      duration_ms: s.durationMs,
      summary: s.summary,
      inputs: s.inputs,
      output: s.output,
      error: s.error,
    })),
  };
}
