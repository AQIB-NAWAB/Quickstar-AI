import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { VoiceHttpContext } from "../context.js";

export const createCampaignsRoutes: RouteModule<VoiceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { authGuard, tenantGuard, workspaceAccess, campaignsCtrl } = ctx;
  const tenant = [authGuard, tenantGuard];
  const read = requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CAMPAIGN_READ);
  const edit = requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CAMPAIGN_EDIT);
  const control = requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CAMPAIGN_CONTROL);

  router.get(
    "/v1/workspaces/:workspaceId/voice/campaigns",
    ...tenant,
    read,
    asyncHandler(campaignsCtrl.list),
  );
  router.post(
    "/v1/workspaces/:workspaceId/voice/campaigns",
    ...tenant,
    edit,
    asyncHandler(campaignsCtrl.create),
  );
  router.post(
    "/v1/workspaces/:workspaceId/voice/campaigns/:campaignId/start",
    ...tenant,
    control,
    asyncHandler(campaignsCtrl.start),
  );
  router.post(
    "/v1/workspaces/:workspaceId/voice/campaigns/:campaignId/targets",
    ...tenant,
    edit,
    asyncHandler(campaignsCtrl.addTargets),
  );
  router.post(
    "/v1/workspaces/:workspaceId/voice/campaigns/:campaignId/process-batch",
    ...tenant,
    control,
    asyncHandler(campaignsCtrl.processBatch),
  );

  return router;
};
