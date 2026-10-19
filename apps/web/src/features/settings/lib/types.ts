export type WorkspaceRole =
  "owner" | "admin" | "developer" | "operator" | "analyst" | "human_agent";

export type SettingsTab =
  | "account"
  | "general"
  | "members"
  | "billing"
  | "api-keys"
  | "secrets"
  | "publishable-keys"
  | "custom-tools"
  | "danger";

export interface WorkspaceData {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  roleUpdatedAt?: string;
  roleUpdatedBy?: string | null;
  createdAt?: string;
  email?: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key_prefix: string;
  api_key: string;
}

export interface SecretItem {
  id: string;
  workspace_id: string;
  name: string;
  key_version: number;
  created_at: string;
  updated_at: string;
}

export interface PublishableKeyItem {
  id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  allowed_origins: string[];
  default_agent_id?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePublishableKeyResult extends PublishableKeyItem {
  publishable_key: string;
}

export type CustomToolKind = "http" | "mcp";

export interface CustomToolItem {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  kind: CustomToolKind;
  config: Record<string, unknown> & {
    method?: string;
    base_url?: string;
    allowed_hosts?: string[];
    path_template?: string;
    headers?: Record<string, string>;
    auth?: { type: "bearer_secret"; secret_name: string };
    timeout_ms?: number;
    idempotent?: boolean;
    server_url?: string;
    allowed_tool_names?: string[];
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  code?: string;
  message: string;
  request_id?: string;
}
