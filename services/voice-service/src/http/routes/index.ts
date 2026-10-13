import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { VoiceHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createCallsRoutes } from "./calls.routes.js";
import { createInternalRoutes } from "./internal.routes.js";
import { createCampaignsRoutes } from "./campaigns.routes.js";
import { createTelephonyPublicRoutes } from "./telephony.routes.js";

const voiceRouteModules = [
  createHealthRoutes,
  createCallsRoutes,
  createCampaignsRoutes,
  createInternalRoutes,
  createTelephonyPublicRoutes,
] as const;

export function createVoiceApiRouter(ctx: VoiceHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, voiceRouteModules));
  return root;
}
