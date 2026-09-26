import { createApiRouter, type Router } from "@quickstart/http-server";
import type { ModelGatewayHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createInternalRoutes } from "./internal.routes.js";

const routeModules = [createHealthRoutes, createInternalRoutes] as const;

export function createModelGatewayApiRouter(context: ModelGatewayHttpContext): Router {
  return createApiRouter(context, routeModules);
}
