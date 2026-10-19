import { SAMPLE_NOTIFICATIONS } from "./fixtures";
import type {
  NotificationsListResult,
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
    filter?: { category?: string; unreadOnly?: boolean; limit?: number },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<NotificationsListResult>> {
    void _workspaceId;
    void _signal;
    let result = [...this.notifications];

    if (filter?.unreadOnly || filter?.category === "unread") {
      result = result.filter((n) => n.readAt === null);
    } else if (filter?.category && filter.category !== "all") {
      result = result.filter((n) => n.category === filter.category);
    }

    const unreadCount = this.notifications.filter((n) => n.readAt === null).length;

    return {
      status: "ready",
      data: {
        notifications: result,
        unreadCount,
        total: result.length,
      },
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
    _workspaceId: string,
    category?: string
  ): Promise<RepositoryResult<{ count: number }>> {
    void _workspaceId;
    let count = 0;
    const now = new Date().toISOString();
    this.notifications.forEach((n) => {
      if (n.readAt === null && (!category || category === "all" || n.category === category)) {
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

  async dismissRead(_workspaceId: string): Promise<RepositoryResult<{ count: number }>> {
    void _workspaceId;
    const initial = this.notifications.length;
    this.notifications = this.notifications.filter((n) => n.readAt === null);
    const count = initial - this.notifications.length;
    this.notify();
    return {
      status: "ready",
      data: { count },
    };
  }
}

export const notificationsPreviewStore = new InMemoryNotificationsPreviewStore();
