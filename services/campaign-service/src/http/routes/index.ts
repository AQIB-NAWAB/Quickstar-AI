import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { CampaignHttpContext } from "../context.js";
import { createCampaignsRoutes } from "./campaigns.routes.js";
import { createHealthRoutes } from "./health.routes.js";
import { createInternalIngestRoutes } from "./internal-ingest.routes.js";

const campaignRouteModules = [
  createHealthRoutes,
  createCampaignsRoutes,
  createInternalIngestRoutes,
] as const;

export function createCampaignApiRouter(ctx: CampaignHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, campaignRouteModules));
  return root;
}
