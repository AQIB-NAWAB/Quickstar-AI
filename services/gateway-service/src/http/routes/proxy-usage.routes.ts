import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createUsageProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.usageUrl);
  router.all("/v1/workspaces/:workspaceId/usage/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/usage", ...chain);
  return router;
};
