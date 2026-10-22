export type AuditEntryChanges = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

export type AuditEntry = {
  id: string;
  workspace_id: string | null;
  org_id: string | null;
  actor_user_id: string;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  request_id: string;
  origin_ip?: string | null;
  country_code?: string | null;
  city?: string | null;
  user_agent?: string | null;
  changes?: AuditEntryChanges | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditListResponse = {
  entries: AuditEntry[];
  next_cursor: string | null;
  total?: number;
};
