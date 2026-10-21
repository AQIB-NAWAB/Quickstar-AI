import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

export const createNotificationsRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, notificationsCtrl } = ctx;

  const readPerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.NOTIFICATIONS_READ);
  const managePerm = requirePermission(authorization, WORKSPACE_PERMISSIONS.NOTIFICATIONS_MANAGE);

  // List notifications with optional category or unread filters
  router.get(
    "/v1/workspaces/:workspaceId/notifications",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(notificationsCtrl.list),
  );

  // Unread count
  router.get(
    "/v1/workspaces/:workspaceId/notifications/unread-count",
    ...tenantMiddleware,
    readPerm,
    asyncHandler(notificationsCtrl.unreadCount),
  );

  // Mark all notifications as read
  router.post(
    "/v1/workspaces/:workspaceId/notifications/read-all",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(notificationsCtrl.markAllAsRead),
  );

  // Dismiss read notifications
  router.post(
    "/v1/workspaces/:workspaceId/notifications/dismiss-read",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(notificationsCtrl.dismissRead),
  );

  // Mark single notification as read
  router.patch(
    "/v1/workspaces/:workspaceId/notifications/:notificationId/read",
    ...tenantMiddleware,
    managePerm,
    asyncHandler(notificationsCtrl.markAsRead),
  );

  return router;
};
