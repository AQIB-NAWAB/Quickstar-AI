export type NotificationCategory =
  | "all"
  | "unread"
  | "system_security"
  | "voice_campaigns"
  | "billing"
  | "knowledge"
  | "general";

export type NotificationSeverity = "info" | "warning" | "error" | "success";

export interface NotificationSource {
  type: string;
  id: string;
  name: string;
}

export interface WorkspaceNotificationItem {
  id: string;
  workspace_id: string;
  recipient_user_id: string | null;
  category: NotificationCategory;
  severity: NotificationSeverity;
  type: string;
  title: string;
  description: string;
  source: NotificationSource | null;
  action_url: string | null;
  action_label: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface NotificationsListResponse {
  notifications: WorkspaceNotificationItem[];
  unread_count: number;
  total: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}
