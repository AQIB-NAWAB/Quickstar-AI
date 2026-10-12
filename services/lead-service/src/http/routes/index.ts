import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { LeadHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createLeadsRoutes } from "./leads.routes.js";

const leadRouteModules = [createHealthRoutes, createLeadsRoutes] as const;

export function createLeadApiRouter(ctx: LeadHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, leadRouteModules));
  return root;
}
