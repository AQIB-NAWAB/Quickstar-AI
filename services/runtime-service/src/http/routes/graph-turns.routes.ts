import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { RuntimeHttpContext } from "../context.js";

export const createGraphTurnsRoutes: RouteModule<RuntimeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, graphTurnsCtrl, workspaceAccess } = ctx;

  const agentEdit = requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_UPDATE);
  const agentView = requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ);

  // Initialize or fetch preview session
  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/preview/session",
    ...tenantMiddleware,
    ctx.graphAuthGuard,
    agentEdit,
    asyncHandler(graphTurnsCtrl.initPreviewSession),
  );

  // Execute preview turn
  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/preview/turns",
    ...tenantMiddleware,
    ctx.graphAuthGuard,
    agentEdit,
    asyncHandler(graphTurnsCtrl.executePreviewTurn),
  );

  // Reset preview session
  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/preview/reset",
    ...tenantMiddleware,
    ctx.graphAuthGuard,
    agentEdit,
    asyncHandler(graphTurnsCtrl.resetPreviewSession),
  );

  // Trace streaming (SSE)
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/preview/traces/stream",
    ...tenantMiddleware,
    ctx.graphAuthGuard,
    agentView,
    asyncHandler(graphTurnsCtrl.streamPreviewTrace),
  );

  // List preview traces
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/preview/traces",
    ...tenantMiddleware,
    ctx.graphAuthGuard,
    agentView,
    asyncHandler(graphTurnsCtrl.listPreviewTraces),
  );

  // Get specific trace
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/preview/traces/:runId",
    ...tenantMiddleware,
    ctx.graphAuthGuard,
    agentView,
    asyncHandler(graphTurnsCtrl.getPreviewTrace),
  );

  return router;
};
