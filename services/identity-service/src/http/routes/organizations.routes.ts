import { asyncHandler, createServiceRouter, requestIdFromResponse, type RouteModule } from "@quickstart/http-server";
import * as organizationsController from "../../controllers/organizations.controller.js";
import { routeParam } from "../../utils/route-param.js";
import { requireUuid } from "../../utils/uuid-param.js";
import type { IdentityHttpContext } from "../context.js";

export const createOrganizationsRoutes: RouteModule<IdentityHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { services, authGuard } = ctx;

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
      const orgId = requireUuid(routeParam(req.params.orgId), "organization id", requestId);
      await organizationsController.handleGetOrganization(
        res,
        requestId,
        orgId,
        auth.userId,
        services.organizations,
      );
    }),
  );

  router.post(
    "/v1/organizations",
    authGuard,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const auth = res.locals.identityAuth!;
      await organizationsController.handleCreateOrganization(
        res,
        requestId,
        auth.userId,
        req.body as { name?: string },
        services.organizations,
      );
    }),
  );

  router.patch(
    "/v1/organizations/:orgId",
    authGuard,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const auth = res.locals.identityAuth!;
      const orgId = requireUuid(routeParam(req.params.orgId), "organization id", requestId);
      await organizationsController.handleUpdateOrganization(
        res,
        requestId,
        orgId,
        auth.userId,
        req.body as { name?: string },
        services.organizations,
      );
    }),
  );

  router.post(
    "/internal/v1/orgs/verify-membership",
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const { orgId, userId } = (req.body ?? {}) as { orgId?: string; userId?: string };
      if (!orgId || !userId) {
        res.writeHead(400, { "content-type": "application/json", "x-request-id": requestId });
        res.end(JSON.stringify({ error: "orgId and userId are required" }));
        return;
      }
      await organizationsController.handleVerifyMembership(
        res,
        requestId,
        orgId,
        userId,
        services.organizations,
      );
    }),
  );

  return router;
};
