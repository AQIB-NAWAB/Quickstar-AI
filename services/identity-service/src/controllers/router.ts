import type { Logger } from "@quickstart/logging";
import {
  asyncHandler,
  createPlatformApp,
  createRateLimitMiddleware,
  requestIdFromResponse,
  type Application,
} from "@quickstart/http-server";
import { requireAuthMiddleware } from "../middleware/index.js";
import type { IdentityServices } from "../services/index.js";
import * as apiKeysController from "./api-keys.controller.js";
import * as authController from "./auth.controller.js";
import { handleHealth } from "./health.controller.js";
import * as organizationsController from "./organizations.controller.js";
import * as usersController from "./users.controller.js";
import { routeParam } from "../utils/route-param.js";

export { SERVICE_NAME } from "./health.controller.js";

export type CreateHttpServerOptions = {
  logger: Logger;
  services: IdentityServices;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  authRateLimitMax?: number;
};

export function createHttpServer(options: CreateHttpServerOptions): Application {
  const { logger, services } = options;
  const authGuard = requireAuthMiddleware(services.auth);
  const authRateLimit = createRateLimitMiddleware({
    windowMs: options.rateLimitWindowMs ?? 60_000,
    max: options.authRateLimitMax ?? 20,
    message: "Too many authentication attempts",
  });

  return createPlatformApp({
    logger,
    requestTimeoutMs: options.requestTimeoutMs,
    globalRateLimit: {
      windowMs: options.rateLimitWindowMs ?? 60_000,
      max: options.rateLimitMax ?? 120,
      skipPaths: ["/healthz", "/health"],
    },
    registerRoutes: (router) => {
      router.get("/healthz", (_req, res) => handleHealth(res));
      router.get("/health", (_req, res) => handleHealth(res));

      router.post(
        "/v1/register",
        authRateLimit,
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          await authController.handleRegister(req, res, requestId, services.auth);
        }),
      );
      router.post(
        "/v1/login",
        authRateLimit,
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          await authController.handleLogin(req, res, requestId, services.auth);
        }),
      );
      router.post(
        "/v1/refresh",
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          await authController.handleRefresh(req, res, requestId, services.auth);
        }),
      );
      router.post(
        "/v1/logout",
        asyncHandler(async (req, res) => {
          await authController.handleLogout(req, res, services.auth);
        }),
      );

      router.get(
        "/v1/me",
        authGuard,
        asyncHandler(async (_req, res) => {
          const requestId = requestIdFromResponse(res);
          const auth = res.locals.identityAuth!;
          await usersController.handleGetMe(res, requestId, auth.userId, services.users);
        }),
      );

      router.get(
        "/v1/organizations",
        authGuard,
        asyncHandler(async (_req, res) => {
          const requestId = requestIdFromResponse(res);
          const auth = res.locals.identityAuth!;
          await organizationsController.handleListOrganizations(
            res,
            requestId,
            auth.userId,
            services.organizations,
          );
        }),
      );

      router.get(
        "/v1/organizations/:orgId",
        authGuard,
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          const auth = res.locals.identityAuth!;
          await organizationsController.handleGetOrganization(
            res,
            requestId,
            routeParam(req.params.orgId),
            auth.userId,
            services.organizations,
          );
        }),
      );

      router.post(
        "/v1/organizations/:orgId/api-keys",
        authGuard,
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          const auth = res.locals.identityAuth!;
          await apiKeysController.handleCreateApiKey(
            req,
            res,
            requestId,
            routeParam(req.params.orgId),
            auth.userId,
            services.apiKeys,
          );
        }),
      );

      router.get(
        "/v1/organizations/:orgId/api-keys",
        authGuard,
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          const auth = res.locals.identityAuth!;
          await apiKeysController.handleListApiKeys(
            res,
            requestId,
            routeParam(req.params.orgId),
            auth.userId,
            services.apiKeys,
          );
        }),
      );

      router.delete(
        "/v1/organizations/:orgId/api-keys/:keyId",
        authGuard,
        asyncHandler(async (req, res) => {
          const auth = res.locals.identityAuth!;
          await apiKeysController.handleRevokeApiKey(
            res,
            routeParam(req.params.orgId),
            auth.userId,
            routeParam(req.params.keyId),
            services.apiKeys,
          );
        }),
      );
    },
  });
}
