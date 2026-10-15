import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { VoiceHttpContext } from "../context.js";

export const createVoiceCatalogRoutes: RouteModule<VoiceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { authGuard, tenantGuard, workspaceAccess, voiceCatalogCtrl } = ctx;
  const tenant = [authGuard, tenantGuard];
  const read = requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ);

  router.get(
    "/v1/workspaces/:workspaceId/voice/catalog",
    ...tenant,
    read,
    asyncHandler(voiceCatalogCtrl.list),
  );
  router.post(
    "/v1/workspaces/:workspaceId/voice/preview",
    ...tenant,
    read,
    asyncHandler(voiceCatalogCtrl.preview),
  );
  return router;
};
