import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { AgentHttpContext } from "../context.js";

export const createCustomToolsRoutes: RouteModule<AgentHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, workspaceAccess, customToolsCtrl } = ctx;
  const chain = tenantMiddleware;

  router.get(
    "/v1/workspaces/:workspaceId/custom-tools",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(customToolsCtrl.listCustomTools),
  );
  router.post(
    "/v1/workspaces/:workspaceId/custom-tools",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_CREATE),
    asyncHandler(customToolsCtrl.createCustomTool),
  );
  router.get(
    "/v1/workspaces/:workspaceId/custom-tools/:toolId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(customToolsCtrl.getCustomTool),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/custom-tools/:toolId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_UPDATE),
    asyncHandler(customToolsCtrl.updateCustomTool),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/custom-tools/:toolId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_DELETE),
    asyncHandler(customToolsCtrl.deleteCustomTool),
  );

  return router;
};
