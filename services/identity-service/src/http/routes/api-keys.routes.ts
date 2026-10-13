import { asyncHandler, createServiceRouter, requestIdFromResponse, type RouteModule } from "@quickstart/http-server";
import * as apiKeysController from "../../controllers/api-keys.controller.js";
import { routeParam } from "../../utils/route-param.js";
import { requireUuid } from "../../utils/uuid-param.js";
import type { IdentityHttpContext } from "../context.js";

export const createApiKeysRoutes: RouteModule<IdentityHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { services, authGuard } = ctx;

  router.post(
    "/v1/organizations/:orgId/api-keys",
    authGuard,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const auth = res.locals.identityAuth!;
      const orgId = requireUuid(routeParam(req.params.orgId), "organization id", requestId);
      await apiKeysController.handleCreateApiKey(
        req,
        res,
        requestId,
        orgId,
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
      const orgId = requireUuid(routeParam(req.params.orgId), "organization id", requestId);
      await apiKeysController.handleListApiKeys(
        res,
        requestId,
        orgId,
        auth.userId,
        services.apiKeys,
      );
    }),
  );

  router.delete(
    "/v1/organizations/:orgId/api-keys/:keyId",
    authGuard,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const auth = res.locals.identityAuth!;
      const orgId = requireUuid(routeParam(req.params.orgId), "organization id", requestId);
      const keyId = requireUuid(routeParam(req.params.keyId), "api key id", requestId);
      await apiKeysController.handleRevokeApiKey(
        res,
        orgId,
        auth.userId,
        keyId,
        services.apiKeys,
        requestId,
      );
    }),
  );

  return router;
};
