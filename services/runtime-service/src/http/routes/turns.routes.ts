import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { RuntimeHttpContext } from "../context.js";

export const createTurnsRoutes: RouteModule<RuntimeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, turnsCtrl, workspaceAccess } = ctx;
  const participate = requireWorkspacePermission(
    workspaceAccess,
    WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE,
  );
  const toolsRun = requireWorkspacePermission(
    workspaceAccess,
    WORKSPACE_PERMISSIONS.TOOLS_RUN,
  );

  router.post(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/turns",
    ...tenantMiddleware,
    participate,
    toolsRun,
    asyncHandler(turnsCtrl.executeTurn),
  );

  return router;
};
