export type NotificationType =
  | "ingest_failed"
  | "usage_threshold"
  | "campaign_attention"
  | "member_joined"
  | "agent_published"
  | string;

export interface NotificationSource {
  name: string;
  id: string;
}

export interface WorkspaceNotification {
  id: string;
  workspaceId: string;
  type: NotificationType;
  title: string;
  description: string;
  source: NotificationSource;
  createdAt: string; // ISO UTC
  readAt: string | null;
  timeAgoLabel: string;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface NotificationsRepository {
  listNotifications(
    workspaceId: string,
    filter?: { unreadOnly?: boolean; type?: string },
    signal?: AbortSignal
  ): Promise<RepositoryResult<WorkspaceNotification[]>>;

  getUnreadCount(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<number>>;

  markAsRead(
    workspaceId: string,
    notificationId: string
  ): Promise<RepositoryResult<WorkspaceNotification>>;

  markAllAsRead(
    workspaceId: string
  ): Promise<RepositoryResult<{ count: number }>>;
}
