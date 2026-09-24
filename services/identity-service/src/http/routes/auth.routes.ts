import { asyncHandler, createServiceRouter, requestIdFromResponse, type RouteModule } from "@quickstart/http-server";
import * as authController from "../../controllers/auth.controller.js";
import type { IdentityHttpContext } from "../context.js";

export const createAuthRoutes: RouteModule<IdentityHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { services, authRateLimit } = ctx;

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

  return router;
};
