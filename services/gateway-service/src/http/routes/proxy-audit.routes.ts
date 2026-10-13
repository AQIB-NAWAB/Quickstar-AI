import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createAuditProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.auditUrl);
  router.all("/v1/workspaces/:workspaceId/audit/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/audit", ...chain);
  return router;
};
