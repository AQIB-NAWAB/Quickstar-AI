import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { createCallsController } from "../controllers/calls.controller.js";
import type { createCampaignsController } from "../controllers/campaigns.controller.js";
import type { createTelephonyController } from "../controllers/telephony.controller.js";

export type VoiceHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  callsCtrl: ReturnType<typeof createCallsController>;
  campaignsCtrl: ReturnType<typeof createCampaignsController>;
  telephonyCtrl: ReturnType<typeof createTelephonyController>;
};
