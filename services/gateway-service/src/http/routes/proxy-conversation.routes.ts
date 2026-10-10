import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createConversationProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.conversationUrl);

  router.post("/v1/workspaces/:workspaceId/conversations", ...chain);
  router.get("/v1/workspaces/:workspaceId/conversations", ...chain);
  router.get("/v1/workspaces/:workspaceId/conversations/:conversationId", ...chain);
  router.post("/v1/workspaces/:workspaceId/conversations/:conversationId/take", ...chain);
  router.post("/v1/workspaces/:workspaceId/conversations/:conversationId/release", ...chain);
  router.post("/v1/workspaces/:workspaceId/conversations/:conversationId/messages", ...chain);
  router.get("/v1/workspaces/:workspaceId/conversations/:conversationId/messages", ...chain);

  return router;
};
