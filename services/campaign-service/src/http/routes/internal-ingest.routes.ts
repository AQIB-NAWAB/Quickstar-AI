import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createCampaignsController } from "../../controllers/campaigns.controller.js";
import type { CampaignHttpContext } from "../context.js";

export const createInternalIngestRoutes: RouteModule<CampaignHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createCampaignsController(ctx.campaigns);

  router.post(
    "/internal/v1/campaigns/leads/ingest",
    ctx.internalAuth,
    asyncHandler(ctrl.ingestLeadDelivery),
  );

  router.post(
    "/internal/v1/campaigns/attempts/reconcile",
    ctx.internalAuth,
    asyncHandler(ctrl.reconcileAttempt),
  );

  return router;
};
