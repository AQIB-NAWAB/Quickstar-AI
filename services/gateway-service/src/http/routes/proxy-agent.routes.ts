import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createAgentProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.agentUrl);

  router.post("/v1/workspaces/:workspaceId/agents", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents/:agentId", ...chain);
  router.patch("/v1/workspaces/:workspaceId/agents/:agentId", ...chain);
  router.delete("/v1/workspaces/:workspaceId/agents/:agentId", ...chain);

  router.post("/v1/workspaces/:workspaceId/agents/:agentId/publish", ...chain);
  router.post("/v1/workspaces/:workspaceId/agents/:agentId/rollback", ...chain);
  router.get("/v1/workspaces/:workspaceId/agents/:agentId/versions", ...chain);
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/versions/:leftId/diff/:rightId",
    ...chain,
  );
  router.get("/v1/workspaces/:workspaceId/agents/:agentId/versions/:versionId", ...chain);

  return router;
};
