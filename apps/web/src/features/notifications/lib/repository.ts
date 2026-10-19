import { notificationsPreviewStore } from "./preview-store";
import type {
  NotificationCategory,
  NotificationsListResult,
  NotificationsRepository,
  RepositoryResult,
  WorkspaceNotification,
} from "./types";

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

type BackendNotificationItem = {
  id: string;
  workspace_id: string;
  category: string;
  severity: string;
  type: string;
  title: string;
  description: string;
  source: { type?: string; id: string; name: string } | null;
  action_url: string | null;
  action_label: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

function mapBackendNotification(raw: BackendNotificationItem): WorkspaceNotification {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    category: (raw.category || "general") as NotificationCategory,
    severity: (raw.severity || "info") as WorkspaceNotification["severity"],
    type: raw.type,
    title: raw.title,
    description: raw.description,
    source: raw.source ? { type: raw.source.type, id: raw.source.id, name: raw.source.name } : null,
    actionUrl: raw.action_url,
    actionLabel: raw.action_label,
    createdAt: raw.created_at,
    readAt: raw.read_at,
    timeAgoLabel: formatTimeAgo(raw.created_at),
  };
}

class ApiNotificationsRepository implements NotificationsRepository {
  async listNotifications(
    workspaceId: string,
    filter?: { category?: string; unreadOnly?: boolean; limit?: number },
    signal?: AbortSignal
  ): Promise<RepositoryResult<NotificationsListResult>> {
    try {
      const params = new URLSearchParams();
      if (filter?.category && filter.category !== "all") {
        params.set("category", filter.category);
      }
      if (filter?.unreadOnly) {
        params.set("unreadOnly", "true");
      }
      if (filter?.limit) {
        params.set("limit", String(filter.limit));
      }

      const qs = params.toString();
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications${qs ? `?${qs}` : ""}`,
        { signal, cache: "no-store" }
      );

      if (!res.ok) {
        return {
          status: "unavailable",
          message: "Notification center service is currently unavailable.",
        };
      }

      const data = (await res.json()) as {
        notifications?: BackendNotificationItem[];
        unread_count?: number;
        total?: number;
      };

      const mapped = (data.notifications ?? []).map(mapBackendNotification);
      return {
        status: "ready",
        data: {
          notifications: mapped,
          unreadCount: data.unread_count ?? mapped.filter((n) => !n.readAt).length,
          total: data.total ?? mapped.length,
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return {
        status: "unavailable",
        message: "Failed to connect to notification center.",
      };
    }
  }

  async getUnreadCount(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<number>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications/unread-count`,
        { signal, cache: "no-store" }
      );
      if (!res.ok) {
        return { status: "unavailable", message: "Unread count unavailable" };
      }
      const data = (await res.json()) as { unread_count?: number };
      return { status: "ready", data: data.unread_count ?? 0 };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Failed to fetch unread count." };
    }
  }

  async markAsRead(
    workspaceId: string,
    notificationId: string
  ): Promise<RepositoryResult<WorkspaceNotification>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications/${encodeURIComponent(notificationId)}/read`,
        { method: "PATCH" }
      );
      if (!res.ok) {
        return { status: "error", message: "Failed to mark notification as read." };
      }
      const data = (await res.json()) as { notification: BackendNotificationItem };
      return { status: "ready", data: mapBackendNotification(data.notification) };
    } catch {
      return { status: "error", message: "Network error marking notification as read." };
    }
  }

  async markAllAsRead(
    workspaceId: string,
    category?: string
  ): Promise<RepositoryResult<{ count: number }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications/read-all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        }
      );
      if (!res.ok) {
        return { status: "error", message: "Failed to mark all as read." };
      }
      const data = (await res.json()) as { count?: number };
      return { status: "ready", data: { count: data.count ?? 0 } };
    } catch {
      return { status: "error", message: "Network error marking all as read." };
    }
  }

  async dismissRead(workspaceId: string): Promise<RepositoryResult<{ count: number }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications/dismiss-read`,
        { method: "POST" }
      );
      if (!res.ok) {
        return { status: "error", message: "Failed to dismiss read notifications." };
      }
      const data = (await res.json()) as { count?: number };
      return { status: "ready", data: { count: data.count ?? 0 } };
    } catch {
      return { status: "error", message: "Network error dismissing read notifications." };
    }
  }
}

export const apiNotificationsRepository = new ApiNotificationsRepository();

export function getNotificationsRepository(isPreview: boolean): NotificationsRepository {
  if (isPreview) {
    return notificationsPreviewStore;
  }
  return apiNotificationsRepository;
}
