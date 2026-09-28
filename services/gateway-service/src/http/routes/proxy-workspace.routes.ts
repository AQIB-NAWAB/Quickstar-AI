import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function protectedOrgWorkspace(ctx: GatewayHttpContext) {
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
  const orgChain = protectedOrgWorkspace(ctx);
  const memberChain = createProtectedWorkspaceProxyChain(ctx, ctx.config.workspaceUrl);

  router.post("/v1/orgs/:orgId/workspaces", ...orgChain);
  router.get("/v1/orgs/:orgId/workspaces", ...orgChain);

  router.get("/v1/workspaces/:workspaceId", ...memberChain);
  router.patch("/v1/workspaces/:workspaceId", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId", ...memberChain);

  router.get("/v1/workspaces/:workspaceId/members", ...memberChain);
  router.get("/v1/workspaces/:workspaceId/members/:userId", ...memberChain);
  router.patch("/v1/workspaces/:workspaceId/members/:userId", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId/members/:userId", ...memberChain);

  router.get("/v1/workspaces/:workspaceId/invites", ...memberChain);
  router.post("/v1/workspaces/:workspaceId/invites", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId/invites/:inviteId", ...memberChain);

  return router;
};
