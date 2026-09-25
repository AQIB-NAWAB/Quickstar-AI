import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function protectedAgent(ctx: GatewayHttpContext) {
  const { requireAccessToken, config } = ctx;
  return [
    requireAccessToken,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.agentUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}

export const createAgentProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = protectedAgent(ctx);

  router.post("/v1/workspaces/:workspaceId/agents", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents/:agentId", ...chain);
  router.patch("/v1/workspaces/:workspaceId/agents/:agentId", ...chain);
  router.delete("/v1/workspaces/:workspaceId/agents/:agentId", ...chain);

  return router;
};
