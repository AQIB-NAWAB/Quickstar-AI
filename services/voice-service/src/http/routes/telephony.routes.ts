import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { VoiceHttpContext } from "../context.js";

/**
 * Public CPaaS webhooks — no staff JWT / internal token.
 * Carriers authenticate via provider signature (Twilio HMAC, SIP bridge HMAC).
 */
export const createTelephonyPublicRoutes: RouteModule<VoiceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { telephonyCtrl } = ctx;

  router.post(
    "/voice/telephony/:providerId/inbound",
    asyncHandler(telephonyCtrl.cpaasInbound),
  );
  router.post(
    "/voice/telephony/:providerId/status",
    asyncHandler(telephonyCtrl.cpaasStatus),
  );

  return router;
};
