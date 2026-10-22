import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
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

    acquireReservation: (async (req, res) => {
      const body = (req.body ?? {}) as {
        org_id?: string;
        workspace_id?: string;
        kind?: "tokens" | "voice";
        estimated_units?: number;
        idempotency_key?: string;
        timeout_seconds?: number;
      };

      if (!body.org_id || !body.workspace_id || !body.kind || typeof body.estimated_units !== "number" || !body.idempotency_key) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "org_id, workspace_id, kind, estimated_units, and idempotency_key are required",
          },
        });
        return;
      }

      const result = await billing.acquireReservation({
        orgId: body.org_id,
        workspaceId: body.workspace_id,
        kind: body.kind,
        estimatedUnits: body.estimated_units,
        idempotencyKey: body.idempotency_key,
        timeoutSeconds: body.timeout_seconds,
      });

      const statusCode = result.granted ? 200 : result.reason === "QUOTA_EXCEEDED" ? 402 : 403;
      sendPlatformJson(res, statusCode, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    commitReservation: (async (req, res) => {
      const body = (req.body ?? {}) as {
        reservation_id?: string;
        actual_units?: number;
        idempotency_key?: string;
      };

      if (!body.reservation_id || typeof body.actual_units !== "number" || !body.idempotency_key) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "reservation_id, actual_units, and idempotency_key are required",
          },
        });
        return;
      }

      const result = await billing.commitReservation({
        reservationId: body.reservation_id,
        actualUnits: body.actual_units,
        idempotencyKey: body.idempotency_key,
      });

      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    releaseReservation: (async (req, res) => {
      const body = (req.body ?? {}) as { reservation_id?: string };
      if (!body.reservation_id) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "reservation_id is required" },
        });
        return;
      }

      const result = await billing.releaseReservation(body.reservation_id);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    checkLimit: (async (req, res) => {
      const body = (req.body ?? {}) as {
        org_id?: string;
        limit_type?: "workspaces" | "agents";
        current_count?: number;
      };

      if (!body.org_id || !body.limit_type || typeof body.current_count !== "number") {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "org_id, limit_type, and current_count are required",
          },
        });
        return;
      }

      const result = await billing.checkLimit(body.org_id, body.limit_type, body.current_count);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    addCredit: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const body = (req.body ?? {}) as {
        amount_cents?: number;
        reason?: string;
        idempotency_key?: string;
      };

      if (!orgId || typeof body.amount_cents !== "number" || !body.reason) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "amount_cents and reason are required",
          },
        });
        return;
      }

      const actorUserId = res.locals.actorUserId ?? (res.locals.tenantContext as any)?.actorId ?? null;
      const credit = await billing.addCredit(
        orgId,
        body.amount_cents,
        body.reason,
        actorUserId,
        body.idempotency_key,
      );

      sendPlatformJson(res, 201, {
        request_id: requestIdFromResponse(res),
        credit,
      });
    }) as RequestHandler,

    listCredits: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;
      const credits = await billing.listCredits(orgId, limit);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        credits,
      });
    }) as RequestHandler,

    getSpendControls: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const controls = await billing.getSpendControls(orgId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        spend_controls: controls,
      });
    }) as RequestHandler,

    upsertSpendControls: (async (req, res) => {
      const orgId = String(req.params.orgId ?? "");
      const body = (req.body ?? {}) as {
        hard_spend_cap_cents?: number | null;
        warning_threshold_percent?: number;
        overage_allowed?: boolean;
      };

      const controls = await billing.upsertSpendControls(orgId, {
        hardSpendCapCents: body.hard_spend_cap_cents,
        warningThresholdPercent: body.warning_threshold_percent,
        overageAllowed: body.overage_allowed,
      });

      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        spend_controls: controls,
      });
    }) as RequestHandler,
  };
}
