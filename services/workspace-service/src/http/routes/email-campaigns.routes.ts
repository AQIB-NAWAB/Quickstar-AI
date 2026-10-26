import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

/**
 * SMTP email campaign module. Mounted under /integrations/email-campaigns so
 * the web app's existing integrations proxy forwards it unchanged.
 */
export const createEmailCampaignRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, emailCampaignsCtrl } = ctx;

  const readPerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.INTEGRATIONS_READ);
  const managePerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.INTEGRATIONS_MANAGE);

  // Sending mailboxes (Google app passwords)
  router.get(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/mailboxes",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(emailCampaignsCtrl.listMailboxes),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/mailboxes",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.connectMailbox),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/mailboxes/:mailboxId/verify",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.verifyMailbox),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/mailboxes/:mailboxId",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.deleteMailbox),
  );

  // Suppression list (workspace-wide)
  router.get(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/suppressions",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(emailCampaignsCtrl.listSuppressions),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/suppressions/:email",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.deleteSuppression),
  );

  // Campaigns
  router.get(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(emailCampaignsCtrl.listCampaigns),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.createCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/sample",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.generateSample),
  );
  router.get(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(emailCampaignsCtrl.getCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.updateCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId/activate",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.activateCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId/pause",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.pauseCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId/resume",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.resumeCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId/cancel",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.cancelCampaign),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/integrations/email-campaigns/:campaignId",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(emailCampaignsCtrl.deleteCampaign),
  );

  return router;
};
