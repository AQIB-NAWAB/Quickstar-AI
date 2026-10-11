import { SAMPLE_NOTIFICATIONS } from "./fixtures";
import type {
NotificationsRepository,
RepositoryResult,
WorkspaceNotification,
} from "./types";

type Listener = () => void;

class InMemoryNotificationsPreviewStore implements NotificationsRepository {
  private notifications: WorkspaceNotification[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.reset();
  }

  reset() {
    this.notifications = JSON.parse(JSON.stringify(SAMPLE_NOTIFICATIONS));
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  async listNotifications(
    _workspaceId: string,
    filter?: { unreadOnly?: boolean; type?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<WorkspaceNotification[]>> {
    void _workspaceId;
    void _signal;
    let result = [...this.notifications];

    if (filter?.unreadOnly) {
      result = result.filter((n) => n.readAt === null);
    }

    if (filter?.type && filter.type !== "all") {
      result = result.filter((n) => n.type === filter.type);
    }

    return {
      status: "ready",
      data: result,
    };
  }

  async getUnreadCount(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<number>> {
    void _workspaceId;
    void _signal;
    const unread = this.notifications.filter((n) => n.readAt === null).length;
    return {
      status: "ready",
      data: unread,
    };
  }

  async markAsRead(
    _workspaceId: string,
    notificationId: string
  ): Promise<RepositoryResult<WorkspaceNotification>> {
    void _workspaceId;
    const item = this.notifications.find((n) => n.id === notificationId);
    if (!item) {
      return { status: "not_found", message: "Notification not found" };
    }
    item.readAt = new Date().toISOString();
    this.notify();
    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(item)),
    };
  }

  async markAllAsRead(
    _workspaceId: string
  ): Promise<RepositoryResult<{ count: number }>> {
    void _workspaceId;
    let count = 0;
    const now = new Date().toISOString();
    this.notifications.forEach((n) => {
      if (n.readAt === null) {
        n.readAt = now;
        count++;
      }
    });
    this.notify();
    return {
      status: "ready",
      data: { count },
    };
  }
}

export const notificationsPreviewStore = new InMemoryNotificationsPreviewStore();
