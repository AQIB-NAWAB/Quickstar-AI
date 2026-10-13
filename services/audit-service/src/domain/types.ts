export type AuditEntryRow = {
  id: string;
  workspace_id: string | null;
  org_id: string | null;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  request_id: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};
