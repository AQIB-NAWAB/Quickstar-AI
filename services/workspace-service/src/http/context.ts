import type { RequestHandler } from "@quickstart/http-server";
import type { createIntegrationsController } from "../controllers/integrations.controller.js";
import type { createEmailCampaignsController } from "../controllers/email-campaigns.controller.js";
import type { createNotificationsController } from "../controllers/notifications.controller.js";
import type { createWebhooksController } from "../controllers/webhooks.controller.js";
import type { createMembersController } from "../controllers/members.controller.js";
import type { createPublishableKeysController } from "../controllers/publishable-keys.controller.js";
import type { createWorkspacesController } from "../controllers/workspaces.controller.js";
import type { AuthorizationService } from "../services/authorization.service.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";

export type WorkspaceHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  internalAuth: RequestHandler;
  /** Auth + tenant validation; spread on each tenant-scoped route so params are available. */
  tenantMiddleware: RequestHandler[];
  authorization: AuthorizationService;
  workspacesCtrl: ReturnType<typeof createWorkspacesController>;
  membersCtrl: ReturnType<typeof createMembersController>;
  publishableKeysCtrl: ReturnType<typeof createPublishableKeysController>;
  integrationsCtrl: ReturnType<typeof createIntegrationsController>;
  emailCampaignsCtrl: ReturnType<typeof createEmailCampaignsController>;
  notificationsCtrl: ReturnType<typeof createNotificationsController>;
  webhooksCtrl: ReturnType<typeof createWebhooksController>;
};
