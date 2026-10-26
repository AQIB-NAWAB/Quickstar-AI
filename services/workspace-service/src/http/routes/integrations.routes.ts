import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

export const createIntegrationsRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, integrationsCtrl } = ctx;

  const readPerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.INTEGRATIONS_READ);
  const managePerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.INTEGRATIONS_MANAGE);

  // List catalog and connection statuses
  router.get(
    "/v1/workspaces/:workspaceId/integrations",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.list),
  );

  // Mailchimp email campaigns (draft → review → explicit send)
  router.get(
    "/v1/workspaces/:workspaceId/integrations/mailchimp/audiences",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.mailchimpAudiences),
  );
  router.get(
    "/v1/workspaces/:workspaceId/integrations/mailchimp/campaigns",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.mailchimpCampaigns),
  );
  router.get(
    "/v1/workspaces/:workspaceId/integrations/mailchimp/campaigns/:campaignId",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.mailchimpCampaign),
  );

  router.get(
    "/v1/workspaces/:workspaceId/integrations/instantly/accounts",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.instantlyAccounts),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/instantly/accounts/google-app-password",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.connectInstantlyGoogleAccount),
  );
  router.get(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.instantlyCampaigns),
  );
  router.get(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns/:campaignId",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.instantlyCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.createInstantlyCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns/:campaignId/activate",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.activateInstantlyCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns/:campaignId/pause",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.pauseInstantlyCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns/:campaignId/resume",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.resumeInstantlyCampaign),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/integrations/instantly/campaigns/:campaignId",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.deleteInstantlyCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/email/personalize",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.personalizeEmail),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/mailchimp/personalize",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.personalizeMailchimpEmail),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/mailchimp/campaigns",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.createMailchimpCampaign),
  );
  router.post(
    "/v1/workspaces/:workspaceId/integrations/mailchimp/campaigns/:campaignId/send",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.sendMailchimpCampaign),
  );

  // Single provider details
  router.get(
    "/v1/workspaces/:workspaceId/integrations/:provider",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.get),
  );

  // OAuth initiate
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/authorize",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.authorize),
  );

  // OAuth callback
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/callback",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.callback),
  );

  // Save credentials
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/credentials",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.credentials),
  );

  // Disconnect
  router.delete(
    "/v1/workspaces/:workspaceId/integrations/:provider/connection",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.disconnect),
  );

  // Sync / Discover resources
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/sync",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.sync),
  );

  // Sync History
  router.get(
    "/v1/workspaces/:workspaceId/integrations/:provider/history",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.syncHistory),
  );

  return router;
};
