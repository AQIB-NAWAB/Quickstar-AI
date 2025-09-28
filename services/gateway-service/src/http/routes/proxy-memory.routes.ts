import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createMemoryProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.memoryUrl);
  router.all("/v1/workspaces/:workspaceId/memory/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/memory", ...chain);
  return router;
};
