import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function protectedWorkspace(ctx: GatewayHttpContext) {
  const { requireAccessToken, config } = ctx;
  return [
    requireAccessToken,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.workspaceUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}

export const createWorkspaceProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = protectedWorkspace(ctx);

  router.post("/v1/orgs/:orgId/workspaces", ...chain);
  router.get("/v1/orgs/:orgId/workspaces", ...chain);

  router.get("/v1/workspaces/:workspaceId", ...chain);
  router.patch("/v1/workspaces/:workspaceId", ...chain);
  router.delete("/v1/workspaces/:workspaceId", ...chain);

  router.get("/v1/workspaces/:workspaceId/members", ...chain);
  router.get("/v1/workspaces/:workspaceId/members/:userId", ...chain);
  router.patch("/v1/workspaces/:workspaceId/members/:userId", ...chain);
  router.delete("/v1/workspaces/:workspaceId/members/:userId", ...chain);

  router.get("/v1/workspaces/:workspaceId/invites", ...chain);
  router.post("/v1/workspaces/:workspaceId/invites", ...chain);
  router.delete("/v1/workspaces/:workspaceId/invites/:inviteId", ...chain);

  router.post("/v1/workspaces/:workspaceId/agents/:agentId/publish", ...chain);

  return router;
};
