import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  createWorkflowsController,
  WORKFLOW_ACTIVATE,
  WORKFLOW_DELETE,
  WORKFLOW_EDIT,
  WORKFLOW_READ,
  WORKFLOW_RUNS_READ,
} from "../../controllers/workflows.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { WorkflowHttpContext } from "../context.js";

export const createWorkflowsRoutes: RouteModule<WorkflowHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createWorkflowsController(ctx.workflows);
  const chain = [ctx.authGuard, ctx.tenantGuard];
  const read = requireWorkspacePermission(ctx.workspaceAccess, WORKFLOW_READ);
  const edit = requireWorkspacePermission(ctx.workspaceAccess, WORKFLOW_EDIT);
  const activate = requireWorkspacePermission(ctx.workspaceAccess, WORKFLOW_ACTIVATE);
  const del = requireWorkspacePermission(ctx.workspaceAccess, WORKFLOW_DELETE);
  const runsRead = requireWorkspacePermission(ctx.workspaceAccess, WORKFLOW_RUNS_READ);

  // Stats & Templates & Catalog
  router.get(
    "/v1/workspaces/:workspaceId/workflows/stats",
    ...chain,
    read,
    asyncHandler(ctrl.stats),
  );
  router.get(
    "/v1/workspaces/:workspaceId/workflows/templates",
    ...chain,
    read,
    asyncHandler(ctrl.templates),
  );
  router.get(
    "/v1/workspaces/:workspaceId/workflows/events/catalog",
    ...chain,
    read,
    asyncHandler(ctrl.catalog),
  );

  // Workspace-wide runs list
  router.get(
    "/v1/workspaces/:workspaceId/workflows/runs",
    ...chain,
    runsRead,
    asyncHandler(ctrl.listRuns),
  );

  // Workflow CRUD
  router.get("/v1/workspaces/:workspaceId/workflows", ...chain, read, asyncHandler(ctrl.list));
  router.post("/v1/workspaces/:workspaceId/workflows", ...chain, edit, asyncHandler(ctrl.create));
  router.get(
    "/v1/workspaces/:workspaceId/workflows/:workflowId",
    ...chain,
    read,
    asyncHandler(ctrl.get),
  );
  router.put(
    "/v1/workspaces/:workspaceId/workflows/:workflowId",
    ...chain,
    edit,
    asyncHandler(ctrl.update),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/workflows/:workflowId",
    ...chain,
    del,
    asyncHandler(ctrl.remove),
  );

  // Graph operations: save draft, validate, simulate, activate, pause, versions
  router.post(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/draft",
    ...chain,
    edit,
    asyncHandler(ctrl.saveDraft),
  );
  router.put(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/draft",
    ...chain,
    edit,
    asyncHandler(ctrl.saveDraft),
  );
  router.post(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/validate",
    ...chain,
    read,
    asyncHandler(ctrl.validate),
  );
  router.post(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/simulations",
    ...chain,
    read,
    asyncHandler(ctrl.simulate),
  );
  router.post(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/activate",
    ...chain,
    activate,
    asyncHandler(ctrl.activate),
  );
  router.post(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/pause",
    ...chain,
    activate,
    asyncHandler(ctrl.pause),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/status",
    ...chain,
    activate,
    asyncHandler(ctrl.status),
  );
  router.get(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/versions",
    ...chain,
    read,
    asyncHandler(ctrl.listVersions),
  );

  // Workflow Runs
  router.get(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/runs",
    ...chain,
    runsRead,
    asyncHandler(ctrl.listRuns),
  );
  router.get(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/runs/:runId",
    ...chain,
    runsRead,
    asyncHandler(ctrl.getRun),
  );
  router.post(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/runs/:runId/cancel",
    ...chain,
    edit,
    asyncHandler(ctrl.cancelRun),
  );

  return router;
};
