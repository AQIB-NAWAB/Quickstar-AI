import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { BillingService } from "../services/billing.service.js";

function rawBodyOf(req: { body?: unknown; rawBody?: string }): string {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body ?? {});
}

export function createBillingController(billing: BillingService) {
  return {
    getSummary: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      if (!orgId) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "orgId is required" },
        });
        return;
      }
      const summary = await billing.getBillingSummary(orgId);
      sendPlatformJson(res, 200, summary);
    }) as RequestHandler,

    createCheckoutSession: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const body = (req.body ?? {}) as {
        plan_id?: string;
        interval?: "month" | "year";
        success_url?: string;
        cancel_url?: string;
      };

      if (!orgId || !body.plan_id || !body.success_url || !body.cancel_url) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "orgId, plan_id, success_url, and cancel_url are required",
          },
        });
        return;
      }

      const session = await billing.createCheckoutSession({
        orgId,
        planId: body.plan_id,
        interval: body.interval ?? "month",
        successUrl: body.success_url,
        cancelUrl: body.cancel_url,
      });

      sendPlatformJson(res, 201, {
        request_id: requestIdFromResponse(res),
        session_id: session.sessionId,
        checkout_url: session.checkoutUrl,
      });
    }) as RequestHandler,

    createCustomerPortalSession: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const body = (req.body ?? {}) as { return_url?: string };

      if (!orgId || !body.return_url) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "orgId and return_url are required",
          },
        });
        return;
      }

      const portal = await billing.createCustomerPortalSession({
        orgId,
        returnUrl: body.return_url,
      });

      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        portal_url: portal.portalUrl,
      });
    }) as RequestHandler,

    cancelSubscription: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const body = (req.body ?? {}) as { immediately?: boolean };

      if (!orgId) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "orgId is required" },
        });
        return;
      }

      const sub = await billing.cancelSubscription({
        orgId,
        immediately: Boolean(body.immediately),
      });

      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        subscription: sub,
      });
    }) as RequestHandler,

    stripeWebhook: (async (req, res) => {
      const sigHeader = req.headers["stripe-signature"] as string | undefined;
      const rawBody = rawBodyOf(req);

      const isValid = billing.verifyWebhookSignature(sigHeader, rawBody);
      if (!isValid) {
        sendPlatformJson(res, 401, {
          request_id: requestIdFromResponse(res),
          error: { code: "UNAUTHORIZED", message: "Invalid Stripe signature" },
        });
        return;
      }

      let event: Record<string, unknown> = {};
      try {
        event = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : JSON.parse(rawBody);
      } catch {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "Invalid webhook payload JSON" },
        });
        return;
      }

      const result = await billing.handleStripeWebhook(event);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        received: true,
        ...result,
      });
    }) as RequestHandler,
  };
}
