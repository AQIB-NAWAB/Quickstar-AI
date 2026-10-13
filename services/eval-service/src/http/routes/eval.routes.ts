import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  EVAL_READ,
  EVAL_RUN,
  createEvalController,
} from "../../controllers/eval.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { EvalHttpContext } from "../context.js";

export const createEvalRoutes: RouteModule<EvalHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createEvalController(ctx.evals);
  const chain = [ctx.authGuard, ctx.tenantGuard];
  const read = requireWorkspacePermission(ctx.workspaceAccess, EVAL_READ);
  const run = requireWorkspacePermission(ctx.workspaceAccess, EVAL_RUN);

  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/cases",
    ...chain,
    read,
    asyncHandler(ctrl.listCases),
  );
  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/cases",
    ...chain,
    run,
    asyncHandler(ctrl.createCase),
  );
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/runs",
    ...chain,
    read,
    asyncHandler(ctrl.listRuns),
  );
  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/runs",
    ...chain,
    run,
    asyncHandler(ctrl.createRun),
  );
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/runs/:runId",
    ...chain,
    read,
    asyncHandler(ctrl.getRun),
  );

  return router;
};
