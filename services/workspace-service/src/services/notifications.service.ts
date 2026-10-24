import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  NotificationCategory,
  NotificationSeverity,
  NotificationsListResponse,
  UnreadCountResponse,
  WorkspaceNotificationItem,
} from "@quickstart/contracts";
import type { NotificationRow, NotificationsRepository } from "../repository/notifications.repository.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNotificationItem(row: NotificationRow): WorkspaceNotificationItem {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    recipient_user_id: row.recipient_user_id,
    category: row.category as NotificationCategory,
    severity: (row.severity || "info") as NotificationSeverity,
    type: row.type,
    title: row.title,
    description: row.description,
    source:
      row.source_id && row.source_name
        ? {
            type: row.source_type ?? "resource",
            id: row.source_id,
            name: row.source_name,
          }
        : null,
    action_url: row.action_url,
    action_label: row.action_label,
    read_at: row.read_at ? (row.read_at instanceof Date ? row.read_at.toISOString() : String(row.read_at)) : null,
    dismissed_at: row.dismissed_at ? (row.dismissed_at instanceof Date ? row.dismissed_at.toISOString() : String(row.dismissed_at)) : null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async list(
    workspaceId: string,
    opts: { category?: string; unreadOnly?: boolean; limit?: number },
  ): Promise<NotificationsListResponse> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const { rows, total, unreadCount } = await this.repo.listByWorkspace(workspaceId, opts);
    return {
      notifications: rows.map(toNotificationItem),
      unread_count: unreadCount,
      total,
    };
  }

  async getUnreadCount(workspaceId: string): Promise<UnreadCountResponse> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const unread_count = await this.repo.getUnreadCount(workspaceId);
    return { unread_count };
  }

  async markAsRead(
    workspaceId: string,
    notificationId: string,
  ): Promise<WorkspaceNotificationItem> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const row = await this.repo.markAsRead(workspaceId, notificationId);
    if (!row) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: `Notification with id ${notificationId} not found`,
      });
    }
    return toNotificationItem(row);
  }

  async markAllAsRead(
    workspaceId: string,
    category?: string,
  ): Promise<{ count: number }> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const count = await this.repo.markAllAsRead(workspaceId, category);
    return { count };
  }

  async dismissRead(workspaceId: string): Promise<{ count: number }> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const count = await this.repo.dismissRead(workspaceId);
    return { count };
  }

  async createNotification(params: {
    workspaceId: string;
    recipientUserId?: string | null;
    category?: string;
    severity?: NotificationSeverity;
    type?: string;
    title: string;
    description: string;
    sourceType?: string | null;
    sourceId?: string | null;
    sourceName?: string | null;
    actionUrl?: string | null;
    actionLabel?: string | null;
    deduplicationKey?: string | null;
  }): Promise<WorkspaceNotificationItem> {
    if (!UUID_REGEX.test(params.workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }
    const row = await this.repo.createNotification({
      workspaceId: params.workspaceId,
      recipientUserId: params.recipientUserId,
      category: params.category ?? "system",
      severity: params.severity ?? "info",
      type: params.type ?? "system",
      title: params.title,
      description: params.description,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      sourceName: params.sourceName,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      deduplicationKey: params.deduplicationKey,
    });
    return toNotificationItem(row);
  }
}
