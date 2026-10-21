import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { UsageHttpContext } from "../context.js";
import { createAnalyticsRoutes } from "./analytics.routes.js";
import { createHealthRoutes } from "./health.routes.js";
import { createUsageRoutes } from "./usage.routes.js";

const usageRouteModules = [
  createHealthRoutes,
  createUsageRoutes,
  createAnalyticsRoutes,
] as const;


export function createUsageApiRouter(ctx: UsageHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, usageRouteModules));
  return root;
}
