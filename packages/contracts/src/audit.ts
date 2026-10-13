/** Feature 27 — audit trail contracts (staff list). */

export type AuditEntry = {
  id: string;
  workspace_id: string | null;
  org_id: string | null;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  request_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditListResponse = {
  entries: AuditEntry[];
  next_cursor: string | null;
};
