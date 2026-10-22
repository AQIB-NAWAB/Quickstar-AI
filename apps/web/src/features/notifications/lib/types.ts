export type NotificationCategory =
  | "all"
  | "unread"
  | "system_security"
  | "voice_campaigns"
  | "billing"
  | "knowledge"
  | "general";

export type NotificationSeverity = "info" | "warning" | "error" | "success";

export type NotificationType =
  | "ingest_failed"
  | "usage_threshold"
  | "campaign_attention"
  | "member_joined"
  | "agent_published"
  | "security_alert"
  | string;

export interface NotificationSource {
  type?: string;
  name: string;
  id: string;
}

export interface WorkspaceNotification {
  id: string;
  workspaceId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  type: NotificationType;
  title: string;
  description: string;
  source?: NotificationSource | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdAt: string; // ISO UTC
  readAt: string | null;
  timeAgoLabel?: string;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface NotificationsListResult {
  notifications: WorkspaceNotification[];
  unreadCount: number;
  total: number;
}

export interface NotificationsRepository {
  listNotifications(
    workspaceId: string,
    filter?: { category?: string; unreadOnly?: boolean; limit?: number },
    signal?: AbortSignal
  ): Promise<RepositoryResult<NotificationsListResult>>;

  getUnreadCount(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<number>>;

  markAsRead(
    workspaceId: string,
    notificationId: string
  ): Promise<RepositoryResult<WorkspaceNotification>>;

  markAllAsRead(
    workspaceId: string,
    category?: string
  ): Promise<RepositoryResult<{ count: number }>>;

  dismissRead?(
    workspaceId: string
  ): Promise<RepositoryResult<{ count: number }>>;
}
