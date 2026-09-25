import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { GatewayHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createAgentProxyRoutes } from "./proxy-agent.routes.js";
import { createIdentityProxyRoutes } from "./proxy-identity.routes.js";
import { createWorkspaceProxyRoutes } from "./proxy-workspace.routes.js";

const gatewayRouteModules = [
  createHealthRoutes,
  createIdentityProxyRoutes,
  createWorkspaceProxyRoutes,
  createAgentProxyRoutes,
] as const;

export function createGatewayApiRouter(context: GatewayHttpContext): Router {
  const root = createServiceRouter();
  root.use(context.redisRateLimit);
  root.use(createApiRouter(context, gatewayRouteModules));
  return root;
}
