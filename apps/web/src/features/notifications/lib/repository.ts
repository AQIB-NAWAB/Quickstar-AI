import { notificationsPreviewStore } from "./preview-store";
import type {
NotificationsRepository,
RepositoryResult,
WorkspaceNotification,
} from "./types";

class UnavailableNotificationsRepository implements NotificationsRepository {
  async listNotifications(
    _workspaceId: string,
    _filter?: { unreadOnly?: boolean; type?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<WorkspaceNotification[]>> {
    void _workspaceId;
    void _filter;
    void _signal;
    return {
      status: "unavailable",
      message: "Notification center service is not connected for this workspace.",
    };
  }

  async getUnreadCount(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<number>> {
    void _workspaceId;
    void _signal;
    return {
      status: "unavailable",
      message: "Unread notifications count is not available.",
    };
  }

  async markAsRead(
    _workspaceId: string,
    _notificationId: string
  ): Promise<RepositoryResult<WorkspaceNotification>> {
    void _workspaceId;
    void _notificationId;
    return {
      status: "unavailable",
      message: "Cannot mark notification as read; service is disconnected.",
    };
  }

  async markAllAsRead(
    _workspaceId: string
  ): Promise<RepositoryResult<{ count: number }>> {
    void _workspaceId;
    return {
      status: "unavailable",
      message: "Cannot mark all notifications as read; service is disconnected.",
    };
  }
}

export const unavailableNotificationsRepository = new UnavailableNotificationsRepository();

export function getNotificationsRepository(isPreview: boolean): NotificationsRepository {
  if (isPreview) {
    return notificationsPreviewStore;
  }
  return unavailableNotificationsRepository;
}
