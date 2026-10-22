import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createRuntimeProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.runtimeUrl);

  router.post("/v1/workspaces/:workspaceId/conversations/:conversationId/turns", ...chain);

  // Graph canvas preview routes
  router.post("/v1/workspaces/:workspaceId/agents/:agentId/preview/session", ...chain);
  router.post("/v1/workspaces/:workspaceId/agents/:agentId/preview/turns", ...chain);
  router.post("/v1/workspaces/:workspaceId/agents/:agentId/preview/reset", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents/:agentId/preview/traces/stream", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents/:agentId/preview/traces/:runId", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents/:agentId/preview/traces", ...chain);

  return router;
};
