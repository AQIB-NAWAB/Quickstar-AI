import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { VoiceHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createCallsRoutes } from "./calls.routes.js";
import { createInternalRoutes } from "./internal.routes.js";
import { createCampaignsRoutes } from "./campaigns.routes.js";
import { createPhoneNumbersRoutes } from "./phone-numbers.routes.js";
import { createTelephonyPublicRoutes } from "./telephony.routes.js";
import { createWidgetLiveStaffRoutes } from "./widget-live-staff.routes.js";
import { createVoiceCatalogRoutes } from "./voice-catalog.routes.js";

const voiceRouteModules = [
  createHealthRoutes,
  createCallsRoutes,
  createCampaignsRoutes,
  createInternalRoutes,
  createPhoneNumbersRoutes,
  createTelephonyPublicRoutes,
  createWidgetLiveStaffRoutes,
  createVoiceCatalogRoutes,
] as const;

export function createVoiceApiRouter(ctx: VoiceHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, voiceRouteModules));
  return root;
}
