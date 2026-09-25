import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function publicProxy(ctx: GatewayHttpContext) {
  return asyncHandler(async (req, res) => {
    await proxyToUpstream(req, res, ctx.config.identityUrl, {
      timeoutMs: ctx.config.httpRequestTimeoutMs,
    });
  });
}

function protectedProxy(ctx: GatewayHttpContext) {
  const { requireAccessToken, config } = ctx;
  return [
    requireAccessToken,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, config.identityUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}

export const createIdentityProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();

  router.post("/v1/register", publicProxy(ctx));
  router.post("/v1/login", publicProxy(ctx));
  router.post("/v1/refresh", publicProxy(ctx));
  router.post("/v1/logout", publicProxy(ctx));

  router.get("/v1/me", ...protectedProxy(ctx));
  router.get("/v1/organizations", ...protectedProxy(ctx));
  router.get("/v1/organizations/:orgId", ...protectedProxy(ctx));
  router.post("/v1/organizations/:orgId/api-keys", ...protectedProxy(ctx));
  router.get("/v1/organizations/:orgId/api-keys", ...protectedProxy(ctx));
  router.delete("/v1/organizations/:orgId/api-keys/:keyId", ...protectedProxy(ctx));

  return router;
};
