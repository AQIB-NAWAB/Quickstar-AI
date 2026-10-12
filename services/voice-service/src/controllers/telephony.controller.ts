import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { TelephonyRouter } from "../telephony/router.js";
import type { SipBridgeProvider } from "../telephony/sip-provider.js";

export function createTelephonyController(router: TelephonyRouter, sip?: SipBridgeProvider) {
  return {
    health: (async (_req, res) => {
      const providers = [];
      for (const p of router.list()) {
        providers.push({ id: p.id, healthy: await p.healthy() });
      }
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        providers,
      });
    }) as RequestHandler,

    /** SBC media-bridge control webhook (SIP path). */
    sipBridgeEvent: (async (req, res) => {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      if (sip && !sip.verifyWebhook(req.headers, rawBody)) {
        sendPlatformJson(res, 401, {
          request_id: requestIdFromResponse(res),
          error: { code: "UNAUTHORIZED", message: "Invalid SIP bridge signature" },
        });
        return;
      }
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        accepted: true,
      });
    }) as RequestHandler,

    /** CPaaS status webhook stub (Twilio/Telnyx). */
    cpaasStatus: (async (req, res) => {
      const providerId = req.params.providerId;
      const provider = router.list().find((p) => p.id === providerId);
      if (!provider) {
        sendPlatformJson(res, 404, {
          request_id: requestIdFromResponse(res),
          error: { code: "NOT_FOUND", message: "Unknown telephony provider" },
        });
        return;
      }
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      if (!provider.verifyWebhook(req.headers, rawBody)) {
        sendPlatformJson(res, 401, {
          request_id: requestIdFromResponse(res),
          error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" },
        });
        return;
      }
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), accepted: true });
    }) as RequestHandler,
  };
}
