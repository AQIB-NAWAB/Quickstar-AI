import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { EvalCase, EvalCaseResult, EvalRun } from "../domain/types.js";
import type { EvalService } from "../services/eval.service.js";
import { routeParam } from "../utils/route-param.js";

export const EVAL_READ = WORKSPACE_PERMISSIONS.EVAL_READ;
export const EVAL_RUN = WORKSPACE_PERMISSIONS.EVAL_RUN;

function toApiCase(c: EvalCase) {
  return {
    id: c.id,
    workspace_id: c.workspaceId,
    agent_id: c.agentId,
    name: c.name,
    input: c.input,
    expected_output: c.expectedOutput,
    created_at: c.createdAt.toISOString(),
  };
}

function toApiRun(run: EvalRun) {
  return {
    id: run.id,
    workspace_id: run.workspaceId,
    agent_id: run.agentId,
    agent_version_id: run.agentVersionId,
    status: run.status,
    case_count: run.caseCount,
    score: run.score,
    idempotency_key: run.idempotencyKey,
    error: run.error,
    started_at: run.startedAt?.toISOString() ?? null,
    finished_at: run.finishedAt?.toISOString() ?? null,
    created_at: run.createdAt.toISOString(),
    updated_at: run.updatedAt.toISOString(),
  };
}

function toApiResult(r: EvalCaseResult) {
  return {
    id: r.id,
    run_id: r.runId,
    case_id: r.caseId,
    workspace_id: r.workspaceId,
    passed: r.passed,
    expected_output: r.expectedOutput,
    actual_output: r.actualOutput,
    error: r.error,
    created_at: r.createdAt.toISOString(),
  };
}

export function createEvalController(evals: EvalService) {
  return {
    createCase: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const agentId = routeParam(req.params.agentId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const c = await evals.createCase(workspaceId, agentId, {
        name: typeof body.name === "string" ? body.name : undefined,
        input: String(body.input ?? ""),
        expected_output: String(body.expected_output ?? body.expectedOutput ?? ""),
      });
      sendPlatformJson(res, 201, { case: toApiCase(c) });
    }) as RequestHandler,

    listCases: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const agentId = routeParam(req.params.agentId);
      const cases = await evals.listCases(workspaceId, agentId);
      sendPlatformJson(res, 200, { cases: cases.map(toApiCase) });
    }) as RequestHandler,

    createRun: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const agentId = routeParam(req.params.agentId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const { run, created } = await evals.createRun(workspaceId, agentId, {
        agent_version_id: body.agent_version_id as string | undefined,
        agentVersionId: body.agentVersionId as string | undefined,
        case_ids: body.case_ids as string[] | undefined,
        caseIds: body.caseIds as string[] | undefined,
        idempotency_key: body.idempotency_key as string | null | undefined,
        idempotencyKey: body.idempotencyKey as string | null | undefined,
      });
      sendPlatformJson(res, created ? 201 : 200, { run: toApiRun(run), created });
    }) as RequestHandler,

    getRun: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const runId = routeParam(req.params.runId);
      const { run, results } = await evals.getRun(workspaceId, runId);
      sendPlatformJson(res, 200, {
        run: toApiRun(run),
        results: results.map(toApiResult),
      });
    }) as RequestHandler,

    listRuns: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const agentId = routeParam(req.params.agentId);
      const runs = await evals.listRuns(workspaceId, agentId);
      sendPlatformJson(res, 200, { runs: runs.map(toApiRun) });
    }) as RequestHandler,
  };
}
