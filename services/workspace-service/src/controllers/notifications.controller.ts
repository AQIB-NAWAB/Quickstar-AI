import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import type { NotificationsService } from "../services/notifications.service.js";
import { routeParam } from "../utils/route-param.js";

export const NOTIFICATIONS_READ = WORKSPACE_PERMISSIONS.NOTIFICATIONS_READ;
export const NOTIFICATIONS_MANAGE = WORKSPACE_PERMISSIONS.NOTIFICATIONS_MANAGE;

function getWorkspaceId(req: { params: Record<string, any> }): string {
  const wid = routeParam(req.params.workspaceId);
  if (!wid) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "workspaceId parameter is required",
    });
  }
  return wid;
}

export function createNotificationsController(service: NotificationsService) {
  return {
    list: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const q = req.query as Record<string, string | undefined>;
      const limitRaw = q.limit ? Number(q.limit) : undefined;
      const unreadOnly = q.unreadOnly === "true" || q.unread === "true";

      const result = await service.list(workspaceId, {
        category: q.category,
        unreadOnly,
        limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
      });

      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    unreadCount: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const result = await service.getUnreadCount(workspaceId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    markAsRead: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const notificationId = routeParam(req.params.notificationId);
      if (!notificationId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "notificationId is required",
        });
      }

      const notification = await service.markAsRead(workspaceId, notificationId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        notification,
      });
    }) as RequestHandler,

    markAllAsRead: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const body = (req.body ?? {}) as { category?: string };
      const q = req.query as Record<string, string | undefined>;
      const category = body.category ?? q.category;

      const result = await service.markAllAsRead(workspaceId, category);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    dismissRead: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const result = await service.dismissRead(workspaceId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    create: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const body = req.body ?? {};
      const notification = await service.createNotification({
        workspaceId,
        recipientUserId: body.recipientUserId ?? body.recipient_user_id,
        category: body.category,
        severity: body.severity,
        type: body.type,
        title: body.title,
        description: body.description,
        sourceType: body.sourceType ?? body.source_type,
        sourceId: body.sourceId ?? body.source_id,
        sourceName: body.sourceName ?? body.source_name,
        actionUrl: body.actionUrl ?? body.action_url,
        actionLabel: body.actionLabel ?? body.action_label,
        deduplicationKey: body.deduplicationKey ?? body.deduplication_key,
      });
      sendPlatformJson(res, 201, {
        request_id: requestIdFromResponse(res),
        notification,
      });
    }) as RequestHandler,
  };
}
