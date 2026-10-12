import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { VoiceHttpContext } from "../context.js";

export const createInternalRoutes: RouteModule<VoiceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { internalAuth, callsCtrl, telephonyCtrl } = ctx;

  router.post(
    "/internal/v1/workspaces/:workspaceId/voice/simulate",
    internalAuth,
    asyncHandler(callsCtrl.simulate),
  );
  router.get("/internal/voice/telephony/health", internalAuth, asyncHandler(telephonyCtrl.health));
  router.post(
    "/internal/voice/telephony/sip/bridge",
    internalAuth,
    asyncHandler(telephonyCtrl.sipBridgeEvent),
  );
  router.post(
    "/internal/voice/telephony/:providerId/status",
    internalAuth,
    asyncHandler(telephonyCtrl.cpaasStatus),
  );

  return router;
};
