import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

export const createIntegrationsRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, integrationsCtrl } = ctx;

  const readPerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.INTEGRATIONS_READ);
  const managePerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.INTEGRATIONS_MANAGE);

  // List catalog and connection statuses
  router.get(
    "/v1/workspaces/:workspaceId/integrations",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.list),
  );

  // Single provider details
  router.get(
    "/v1/workspaces/:workspaceId/integrations/:provider",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(integrationsCtrl.get),
  );

  // OAuth initiate
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/authorize",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.authorize),
  );

  // OAuth callback
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/callback",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.callback),
  );

  // Save credentials
  router.post(
    "/v1/workspaces/:workspaceId/integrations/:provider/credentials",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.credentials),
  );

  // Disconnect
  router.delete(
    "/v1/workspaces/:workspaceId/integrations/:provider/connection",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(integrationsCtrl.disconnect),
  );

  return router;
};
