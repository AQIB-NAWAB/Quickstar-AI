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

  return router;
};
