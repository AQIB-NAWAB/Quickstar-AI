import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

export const createWebhooksRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, webhooksCtrl } = ctx;

  const readPerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.WEBHOOKS_READ);
  const managePerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.WEBHOOKS_MANAGE);

  // List endpoints
  router.get(
    "/v1/workspaces/:workspaceId/webhooks",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(webhooksCtrl.listEndpoints),
  );

  // Register new endpoint
  router.post(
    "/v1/workspaces/:workspaceId/webhooks",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(webhooksCtrl.createEndpoint),
  );

  // Workspace-wide deliveries listing
  router.get(
    "/v1/workspaces/:workspaceId/webhooks/deliveries",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(webhooksCtrl.listDeliveries),
  );

  // Direct delivery detail
  router.get(
    "/v1/workspaces/:workspaceId/webhooks/deliveries/:deliveryId",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(webhooksCtrl.getDelivery),
  );

  // Direct delivery redrive
  router.post(
    "/v1/workspaces/:workspaceId/webhooks/deliveries/:deliveryId/redrive",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(webhooksCtrl.redriveDelivery),
  );

  // Endpoint-scoped deliveries listing
  router.get(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId/deliveries",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(webhooksCtrl.listDeliveries),
  );

  // Endpoint-scoped single delivery lookup
  router.get(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId/deliveries/:deliveryId",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(webhooksCtrl.getDelivery),
  );

  // Endpoint-scoped redrive
  router.post(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId/deliveries/:deliveryId/redrive",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(webhooksCtrl.redriveDelivery),
  );

  // Endpoint secret rotation
  router.post(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId/rotate-secret",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(webhooksCtrl.rotateSecret),
  );

  // Single endpoint details
  router.get(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(webhooksCtrl.getEndpoint),
  );

  // Update endpoint
  router.patch(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(webhooksCtrl.updateEndpoint),
  );

  // Delete endpoint
  router.delete(
    "/v1/workspaces/:workspaceId/webhooks/:endpointId",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(webhooksCtrl.deleteEndpoint),
  );

  return router;
};
