import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function protectedRuntime(ctx: GatewayHttpContext) {
  const { requireAccessToken, config } = ctx;
  return [
    requireAccessToken,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.runtimeUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}

export const createRuntimeProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = protectedRuntime(ctx);

  router.post("/v1/workspaces/:workspaceId/conversations/:conversationId/turns", ...chain);

  return router;
};
