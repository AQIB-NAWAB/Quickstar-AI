import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createLeadGenerationProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(
    ctx,
    ctx.config.leadGenerationUrl ?? "http://127.0.0.1:3019",
  );
  router.all("/v1/workspaces/:workspaceId/lead-generation", ...chain);
  router.all("/v1/workspaces/:workspaceId/lead-generation/*", ...chain);
  return router;
};
