import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function protectedConversation(ctx: GatewayHttpContext) {
  const { requireAccessToken, config } = ctx;
  return [
    requireAccessToken,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.conversationUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}

export const createConversationProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = protectedConversation(ctx);

  router.post("/v1/workspaces/:workspaceId/conversations", ...chain);
  router.get("/v1/workspaces/:workspaceId/conversations", ...chain);
  router.get("/v1/workspaces/:workspaceId/conversations/:conversationId", ...chain);
  router.post("/v1/workspaces/:workspaceId/conversations/:conversationId/messages", ...chain);
  router.get("/v1/workspaces/:workspaceId/conversations/:conversationId/messages", ...chain);

  return router;
};
