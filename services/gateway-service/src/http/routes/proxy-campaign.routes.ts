import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createCampaignProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.campaignUrl);
  router.all("/v1/workspaces/:workspaceId/campaigns/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/campaigns", ...chain);
  return router;
};
