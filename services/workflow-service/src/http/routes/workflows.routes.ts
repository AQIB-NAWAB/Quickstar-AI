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

  router.get(
    "/v1/workspaces/:workspaceId/workflows/events/catalog",
    ...chain,
    read,
    asyncHandler(ctrl.catalog),
  );
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
  // Activate/pause use the same PUT with status; require activate permission when body asks for it
  // via edit above for drafts; activate permission checked in a dedicated PATCH.
  router.patch(
    "/v1/workspaces/:workspaceId/workflows/:workflowId/status",
    ...chain,
    activate,
    asyncHandler(ctrl.update),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/workflows/:workflowId",
    ...chain,
    del,
    asyncHandler(ctrl.remove),
  );
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

  return router;
};
