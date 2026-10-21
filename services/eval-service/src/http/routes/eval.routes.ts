import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  EVAL_READ,
  EVAL_RUN,
  EVAL_WRITE,
  createEvalController,
} from "../../controllers/eval.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { EvalHttpContext } from "../context.js";

export const createEvalRoutes: RouteModule<EvalHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createEvalController(ctx.evals);
  const chain = [ctx.authGuard, ctx.tenantGuard];
  const read = requireWorkspacePermission(ctx.workspaceAccess, EVAL_READ);
  const write = requireWorkspacePermission(ctx.workspaceAccess, EVAL_WRITE);
  const run = requireWorkspacePermission(ctx.workspaceAccess, EVAL_RUN);

  /* Summary */
  router.get(
    "/v1/workspaces/:workspaceId/eval/summary",
    ...chain,
    read,
    asyncHandler(ctrl.getSummary),
  );

  /* Datasets */
  router.get(
    "/v1/workspaces/:workspaceId/eval/datasets",
    ...chain,
    read,
    asyncHandler(ctrl.listDatasets),
  );
  router.post(
    "/v1/workspaces/:workspaceId/eval/datasets",
    ...chain,
    write,
    asyncHandler(ctrl.createDataset),
  );
  router.get(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId",
    ...chain,
    read,
    asyncHandler(ctrl.getDataset),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId",
    ...chain,
    write,
    asyncHandler(ctrl.updateDataset),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId",
    ...chain,
    write,
    asyncHandler(ctrl.archiveDataset),
  );

  /* Test Cases */
  router.get(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/cases",
    ...chain,
    read,
    asyncHandler(ctrl.listCases),
  );
  router.post(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/cases",
    ...chain,
    write,
    asyncHandler(ctrl.createCase),
  );
  router.get(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/cases/:caseId",
    ...chain,
    read,
    asyncHandler(ctrl.getCase),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/cases/:caseId",
    ...chain,
    write,
    asyncHandler(ctrl.updateCase),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/cases/:caseId",
    ...chain,
    write,
    asyncHandler(ctrl.deleteCase),
  );
  router.post(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/import",
    ...chain,
    write,
    asyncHandler(ctrl.importCases),
  );
  router.get(
    "/v1/workspaces/:workspaceId/eval/datasets/:datasetId/export",
    ...chain,
    read,
    asyncHandler(ctrl.exportCases),
  );

  /* Runs */
  router.get(
    "/v1/workspaces/:workspaceId/eval/runs",
    ...chain,
    read,
    asyncHandler(ctrl.listRuns),
  );
  router.post(
    "/v1/workspaces/:workspaceId/eval/runs",
    ...chain,
    run,
    asyncHandler(ctrl.createRun),
  );
  router.get(
    "/v1/workspaces/:workspaceId/eval/runs/:runId",
    ...chain,
    read,
    asyncHandler(ctrl.getRun),
  );
  router.get(
    "/v1/workspaces/:workspaceId/eval/runs/:runId/results",
    ...chain,
    read,
    asyncHandler(ctrl.getRunResults),
  );

  /* Comparisons */
  router.post(
    "/v1/workspaces/:workspaceId/eval/comparisons",
    ...chain,
    read,
    asyncHandler(ctrl.createComparison),
  );
  router.get(
    "/v1/workspaces/:workspaceId/eval/comparisons/:comparisonId",
    ...chain,
    read,
    asyncHandler(ctrl.getComparison),
  );

  /* Legacy agent-scoped endpoints for backward compatibility */
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/cases",
    ...chain,
    read,
    asyncHandler(ctrl.legacyListCases),
  );
  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/cases",
    ...chain,
    write,
    asyncHandler(ctrl.legacyCreateCase),
  );
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/eval/runs",
    ...chain,
    read,
    asyncHandler(ctrl.legacyListRuns),
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
