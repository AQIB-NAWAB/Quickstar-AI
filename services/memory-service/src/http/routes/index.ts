import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { MemoryHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createFactsRoutes } from "./facts.routes.js";
import { createInternalRoutes } from "./internal.routes.js";

const memoryRouteModules = [
  createHealthRoutes,
  createFactsRoutes,
  createInternalRoutes,
] as const;

export function createMemoryApiRouter(ctx: MemoryHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, memoryRouteModules));
  return root;
}
