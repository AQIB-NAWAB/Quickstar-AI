import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  CAMPAIGN_CONTROL,
  CAMPAIGN_EDIT,
  CAMPAIGN_READ,
  createCampaignsController,
} from "../../controllers/campaigns.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { CampaignHttpContext } from "../context.js";

export const createCampaignsRoutes: RouteModule<CampaignHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createCampaignsController(ctx.campaigns);
  const chain = [ctx.authGuard, ctx.tenantGuard];
  const read = requireWorkspacePermission(ctx.workspaceAccess, CAMPAIGN_READ);
  const edit = requireWorkspacePermission(ctx.workspaceAccess, CAMPAIGN_EDIT);
  const control = requireWorkspacePermission(ctx.workspaceAccess, CAMPAIGN_CONTROL);

  router.get("/v1/workspaces/:workspaceId/campaigns", ...chain, read, asyncHandler(ctrl.list));
  router.post("/v1/workspaces/:workspaceId/campaigns", ...chain, edit, asyncHandler(ctrl.create));
  router.get(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId",
    ...chain,
    read,
    asyncHandler(ctrl.get),
  );
  router.post(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/targets/import",
    ...chain,
    edit,
    asyncHandler(ctrl.importTargets),
  );
  router.post(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/launch",
    ...chain,
    control,
    asyncHandler(ctrl.launch),
  );
  router.post(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/pause",
    ...chain,
    control,
    asyncHandler(ctrl.pause),
  );
  router.post(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/resume",
    ...chain,
    control,
    asyncHandler(ctrl.resume),
  );
  router.post(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/stop",
    ...chain,
    control,
    asyncHandler(ctrl.stop),
  );
  router.get(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/contacts",
    ...chain,
    read,
    asyncHandler(ctrl.listTargets),
  );
  router.get(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/contacts/:contactId",
    ...chain,
    read,
    asyncHandler(ctrl.getTarget),
  );
  router.get(
    "/v1/workspaces/:workspaceId/campaigns/:campaignId/attempts",
    ...chain,
    read,
    asyncHandler(ctrl.listAttempts),
  );

  return router;
};
