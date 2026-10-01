import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createSecretsProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.secretsUrl);
  router.all("/v1/workspaces/:workspaceId/secrets/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/secrets", ...chain);
  return router;
};
