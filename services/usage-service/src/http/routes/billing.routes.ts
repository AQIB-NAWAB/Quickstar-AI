import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createBillingController } from "../../controllers/billing.controller.js";
import type { UsageHttpContext } from "../context.js";

export const createBillingRoutes: RouteModule<UsageHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createBillingController(ctx.billing);

  // Public raw webhook endpoint for Stripe events
  router.post("/v1/billing/stripe/webhook", asyncHandler(ctrl.stripeWebhook));

  // Organization billing endpoints (authenticated)
  router.get("/v1/organizations/:orgId/billing", ctx.authGuard, asyncHandler(ctrl.getSummary));
  router.post(
    "/v1/organizations/:orgId/billing/checkout",
    ctx.authGuard,
    asyncHandler(ctrl.createCheckoutSession),
  );
  router.post(
    "/v1/organizations/:orgId/billing/portal",
    ctx.authGuard,
    asyncHandler(ctrl.createCustomerPortalSession),
  );
  router.post(
    "/v1/organizations/:orgId/billing/cancel",
    ctx.authGuard,
    asyncHandler(ctrl.cancelSubscription),
  );

  // Spend controls and credits
  router.get(
    "/v1/organizations/:orgId/billing/spend-controls",
    ctx.authGuard,
    asyncHandler(ctrl.getSpendControls),
  );
  router.put(
    "/v1/organizations/:orgId/billing/spend-controls",
    ctx.authGuard,
    asyncHandler(ctrl.upsertSpendControls),
  );
  router.get(
    "/v1/organizations/:orgId/billing/credits",
    ctx.authGuard,
    asyncHandler(ctrl.listCredits),
  );
  router.post(
    "/v1/organizations/:orgId/billing/credits",
    ctx.authGuard,
    asyncHandler(ctrl.addCredit),
  );

  // Internal reservation and plan quota enforcement endpoints
  router.post(
    "/internal/v1/billing/reservations/acquire",
    ctx.internalAuth,
    asyncHandler(ctrl.acquireReservation),
  );
  router.post(
    "/internal/v1/billing/reservations/commit",
    ctx.internalAuth,
    asyncHandler(ctrl.commitReservation),
  );
  router.post(
    "/internal/v1/billing/reservations/release",
    ctx.internalAuth,
    asyncHandler(ctrl.releaseReservation),
  );
  router.post(
    "/internal/v1/billing/check-limit",
    ctx.internalAuth,
    asyncHandler(ctrl.checkLimit),
  );

  return router;
};
