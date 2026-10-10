import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

export const createPublishableKeysRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, publishableKeysCtrl } = ctx;
  const manage = requirePermission(authorization, WORKSPACE_PERMISSIONS.PUBLISHABLE_KEY_MANAGE);

  router.post(
    "/v1/workspaces/:workspaceId/publishable-keys",
    ...tenantMiddleware,
    manage,
    asyncHandler(publishableKeysCtrl.create),
  );
  router.get(
    "/v1/workspaces/:workspaceId/publishable-keys",
    ...tenantMiddleware,
    manage,
    asyncHandler(publishableKeysCtrl.list),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/publishable-keys/:keyId",
    ...tenantMiddleware,
    manage,
    asyncHandler(publishableKeysCtrl.update),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/publishable-keys/:keyId",
    ...tenantMiddleware,
    manage,
    asyncHandler(publishableKeysCtrl.revoke),
  );

  return router;
};
