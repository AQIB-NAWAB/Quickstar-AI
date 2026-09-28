import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createKnowledgeProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.knowledgeUrl);
  router.all("/v1/workspaces/:workspaceId/knowledge/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/knowledge", ...chain);
  return router;
};
