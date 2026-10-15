import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { createCallsController } from "../controllers/calls.controller.js";
import type { createCampaignsController } from "../controllers/campaigns.controller.js";
import type { createTelephonyController } from "../controllers/telephony.controller.js";
import type { createWidgetVoiceController } from "../controllers/widget-voice.controller.js";
import type { createWidgetVoiceLiveController } from "../controllers/widget-voice-live.controller.js";
import type { createVoiceCatalogController } from "../controllers/voice-catalog.controller.js";

export type VoiceHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  callsCtrl: ReturnType<typeof createCallsController>;
  campaignsCtrl: ReturnType<typeof createCampaignsController>;
  telephonyCtrl: ReturnType<typeof createTelephonyController>;
  widgetVoiceCtrl: ReturnType<typeof createWidgetVoiceController>;
  widgetVoiceLiveCtrl: ReturnType<typeof createWidgetVoiceLiveController>;
  voiceCatalogCtrl: ReturnType<typeof createVoiceCatalogController>;
};
