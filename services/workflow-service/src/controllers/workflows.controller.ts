import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { WorkflowDefinition, WorkflowRunRecord } from "../domain/types.js";
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
    draft_graph: wf.draftGraph,
    draft_revision: wf.draftRevision,
    settings: wf.settings,
    active_version_id: wf.activeVersionId,
    active_version_number: wf.activeVersionNumber,
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
    stats: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const stats = await workflows.getStats(workspaceId);
      sendPlatformJson(res, 200, { stats });
    }) as RequestHandler,

    templates: ((_req, res) => {
      sendPlatformJson(res, 200, { templates: workflows.listTemplates() });
    }) as RequestHandler,

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
          draft_revision: w.draftRevision,
          active_version_number: w.activeVersionNumber,
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
        draft_graph: (body.draft_graph as any) ?? null,
        settings: (body.settings as any) ?? undefined,
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

    saveDraft: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const body = (req.body ?? {}) as Record<string, any>;
      const wf = await workflows.saveDraft(workspaceId, workflowId, {
        graph: body.graph || body.draft_graph,
        settings: body.settings,
        expectedRevision: body.expected_revision ?? body.expectedRevision,
        name: body.name,
        description: body.description,
      });
      sendPlatformJson(res, 200, { workflow: toApiDefinition(wf) });
    }) as RequestHandler,

    activate: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const body = (req.body ?? {}) as Record<string, any>;
      const result = await workflows.activate(workspaceId, workflowId, {
        changelog: body.changelog,
        createdBy: res.locals.actorUserId,
        expectedRevision: body.expected_revision,
      });
      sendPlatformJson(res, 200, {
        workflow: toApiDefinition(result.definition),
        version: {
          id: result.versionRecord.id,
          version_number: result.versionRecord.versionNumber,
          activated_at: result.versionRecord.activatedAt,
        },
      });
    }) as RequestHandler,

    status: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId),
        workflowId = routeParam(req.params.workflowId);
      if (req.body?.status === "paused") {
        sendPlatformJson(res, 200, {
          workflow: toApiDefinition(await workflows.pause(workspaceId, workflowId)),
        });
        return;
      }
      const result = await workflows.activate(workspaceId, workflowId, {
        expectedRevision: req.body?.expected_revision ?? req.body?.expected_version,
        createdBy: res.locals.actorUserId,
      });
      sendPlatformJson(res, 200, { workflow: toApiDefinition(result.definition) });
    }) as RequestHandler,
    pause: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const wf = await workflows.pause(workspaceId, workflowId);
      sendPlatformJson(res, 200, { workflow: toApiDefinition(wf) });
    }) as RequestHandler,

    validate: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const body = (req.body ?? {}) as Record<string, any>;
      const wf = await workflows.get(workspaceId, workflowId);
      const graph = body.graph || body.draft_graph || wf.draftGraph;
      const result = workflows.validateGraph(graph, wf.draftRevision);
      sendPlatformJson(res, 200, { validation: result });
    }) as RequestHandler,

    simulate: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const body = (req.body ?? {}) as Record<string, any>;
      const result = await workflows.simulate(workspaceId, workflowId, {
        graph: body.graph || body.draft_graph,
        samplePayload: body.sample_payload || body.samplePayload,
      });
      sendPlatformJson(res, 200, { simulation: result });
    }) as RequestHandler,

    listVersions: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const versions = await workflows.listVersions(workspaceId, workflowId);
      sendPlatformJson(res, 200, {
        versions: versions.map((v) => ({
          id: v.id,
          version_number: v.versionNumber,
          activated_at: v.activatedAt,
          activated_by_user_id: v.activatedByUserId,
        })),
      });
    }) as RequestHandler,

    remove: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      await workflows.delete(workspaceId, workflowId);
      sendPlatformJson(res, 200, { deleted: true });
    }) as RequestHandler,

    listRuns: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = req.params.workflowId ? routeParam(req.params.workflowId) : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
      const offset =
        typeof req.query.offset === "string" ? parseInt(req.query.offset, 10) : undefined;

      const result = await workflows.listRuns(workspaceId, workflowId, {
        status,
        search,
        limit,
        offset,
      });
      sendPlatformJson(res, 200, {
        runs: result.runs.map(toApiRun),
        total: result.total,
      });
    }) as RequestHandler,

    getRun: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const workflowId = routeParam(req.params.workflowId);
      const runId = routeParam(req.params.runId);
      const run = await workflows.getRun(workspaceId, workflowId, runId);
      sendPlatformJson(res, 200, { run: toApiRun(run) });
    }) as RequestHandler,

    cancelRun: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const runId = routeParam(req.params.runId);
      await workflows.getRun(workspaceId, routeParam(req.params.workflowId), runId);
      const ok = await workflows.cancelRun(workspaceId, runId);
      sendPlatformJson(res, 200, { canceled: ok });
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

function toApiRun(run: WorkflowRunRecord) {
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
