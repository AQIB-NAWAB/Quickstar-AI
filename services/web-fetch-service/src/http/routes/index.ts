import { createApiRouter, type Router } from "@quickstart/http-server";
import type { WebFetchHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createInternalRoutes } from "./internal.routes.js";

const routeModules = [createHealthRoutes, createInternalRoutes] as const;

export function createWebFetchApiRouter(context: WebFetchHttpContext): Router {
  return createApiRouter(context, routeModules);
}
