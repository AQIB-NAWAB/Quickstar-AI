import { AppError, ErrorCode } from "@quickstart/errors";
import { asyncHandler, createServiceRouter, requestIdFromResponse, type RouteModule } from "@quickstart/http-server";
import { fetchWithPolicy } from "@quickstart/utilities";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import { proxyToUpstream } from "../../lib/proxy.js";
import type { GatewayHttpContext } from "../context.js";

function protectedOrgWorkspace(ctx: GatewayHttpContext) {
  const { requireAccessToken, config } = ctx;
  return [
    requireAccessToken,
    asyncHandler(async (req, res, next) => {
      const access = res.locals.accessToken;
      const rawOrg = req.params.orgId;
      const orgId = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;
      const requestId = requestIdFromResponse(res);

      if (!access) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required",
          requestId,
        });
      }

      if (!orgId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Organization ID required",
          requestId,
        });
      }

      // Machine API keys are strictly bound to access.org_id
      if (access.isApiKey) {
        if (access.org_id !== orgId) {
          throw new AppError({
            code: ErrorCode.FORBIDDEN,
            message: "API key is not authorized for this organization",
            requestId,
          });
        }
        return next();
      }

      // If token's org_id matches target orgId, user is authoritatively verified
      if (access.org_id === orgId) {
        return next();
      }

      // For multi-org users, verify membership with identity-service
      if (config.identityUrl) {
        try {
          const verifyRes = await fetchWithPolicy(
            `${config.identityUrl}/v1/organizations/${encodeURIComponent(orgId)}`,
            {
              method: "GET",
              headers: {
                authorization: `Bearer ${res.locals.rawBearerToken}`,
                "x-request-id": requestId,
              },
            },
            { timeoutMs: config.httpRequestTimeoutMs, maxRetries: 0 },
          );

          if (verifyRes.status === 403 || verifyRes.status === 404) {
            throw new AppError({
              code: ErrorCode.FORBIDDEN,
              message: "Access denied: not a member of organization",
              requestId,
            });
          }

          if (!verifyRes.ok) {
            throw new AppError({
              code: ErrorCode.UPSTREAM_UNAVAILABLE,
              message: "Identity service unavailable for organization verification",
              requestId,
            });
          }

          return next();
        } catch (err) {
          if (err instanceof AppError) throw err;
          throw new AppError({
            code: ErrorCode.FORBIDDEN,
            message: "Access denied: not a member of organization",
            requestId,
          });
        }
      }

      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied: not a member of organization",
        requestId,
      });
    }),
    asyncHandler(async (req, res) => {
      const rawOrg = req.params.orgId;
      const orgId = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;
      await proxyToUpstream(req, res, config.workspaceUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: {
          ...res.locals.accessToken!,
          org_id: orgId ?? res.locals.accessToken!.org_id,
        },
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}

function publicWorkspaceProxy(ctx: GatewayHttpContext) {
  return asyncHandler(async (req, res) => {
    await proxyToUpstream(req, res, ctx.config.workspaceUrl, {
      timeoutMs: ctx.config.httpRequestTimeoutMs,
    });
  });
}

function protectedWorkspaceProxy(ctx: GatewayHttpContext) {
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

  // Invite endpoints
  router.get("/v1/invites/verify", publicWorkspaceProxy(ctx));
  router.post("/v1/invites/accept", ...protectedWorkspaceProxy(ctx));

  router.post("/v1/orgs/:orgId/workspaces", ...orgChain);
  router.get("/v1/orgs/:orgId/workspaces", ...orgChain);

  router.get("/v1/workspaces/:workspaceId", ...memberChain);
  router.patch("/v1/workspaces/:workspaceId", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId", ...memberChain);

  router.get("/v1/workspaces/:workspaceId/members", ...memberChain);
  router.get("/v1/workspaces/:workspaceId/members/:userId", ...memberChain);
  router.patch("/v1/workspaces/:workspaceId/members/:userId", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId/members/:userId", ...memberChain);
  router.post("/v1/workspaces/:workspaceId/transfer-ownership", ...memberChain);

  router.get("/v1/workspaces/:workspaceId/invites", ...memberChain);
  router.post("/v1/workspaces/:workspaceId/invites", ...memberChain);
  router.post("/v1/workspaces/:workspaceId/invites/:inviteId/resend", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId/invites/:inviteId", ...memberChain);

  router.get("/v1/workspaces/:workspaceId/publishable-keys", ...memberChain);
  router.post("/v1/workspaces/:workspaceId/publishable-keys", ...memberChain);
  router.patch("/v1/workspaces/:workspaceId/publishable-keys/:keyId", ...memberChain);
  router.delete("/v1/workspaces/:workspaceId/publishable-keys/:keyId", ...memberChain);

  router.all("/v1/workspaces/:workspaceId/integrations/*", ...memberChain);
  router.all("/v1/workspaces/:workspaceId/integrations", ...memberChain);

  router.all("/v1/workspaces/:workspaceId/notifications/*", ...memberChain);
  router.all("/v1/workspaces/:workspaceId/notifications", ...memberChain);

  router.all("/v1/workspaces/:workspaceId/webhooks/*", ...memberChain);
  router.all("/v1/workspaces/:workspaceId/webhooks", ...memberChain);

  return router;
};
