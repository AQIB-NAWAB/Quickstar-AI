import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { KnowledgeHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createSourcesRoutes } from "./sources.routes.js";
import { createInternalRoutes } from "./internal.routes.js";

const knowledgeRouteModules = [
  createHealthRoutes,
  createSourcesRoutes,
  createInternalRoutes,
] as const;

export function createKnowledgeApiRouter(ctx: KnowledgeHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, knowledgeRouteModules));
  return root;
}
