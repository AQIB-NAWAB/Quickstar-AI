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

  return router;
};
