import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createUsageProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.usageUrl);
  const { requireAccessToken, config } = ctx;

  const orgBillingChain = [
    requireAccessToken,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.usageUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];

  const publicBillingWebhook = [
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.usageUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
      });
    }),
  ];

  router.all("/v1/workspaces/:workspaceId/usage/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/usage", ...chain);
  router.all("/v1/workspaces/:workspaceId/analytics/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/analytics", ...chain);

  router.all("/v1/organizations/:orgId/billing/*", ...orgBillingChain);
  router.all("/v1/organizations/:orgId/billing", ...orgBillingChain);
  router.all("/v1/orgs/:orgId/billing/*", ...orgBillingChain);
  router.all("/v1/orgs/:orgId/billing", ...orgBillingChain);

  router.post("/v1/billing/stripe/webhook", ...publicBillingWebhook);

  return router;
};

