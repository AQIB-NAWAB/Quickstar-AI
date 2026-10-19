-- Migration 002: Audit Search, Origin Details, and Changes
ALTER TABLE audit_entries
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS actor_email TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS origin_ip TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS changes JSONB;

CREATE INDEX IF NOT EXISTS audit_entries_workspace_action_idx
  ON audit_entries (workspace_id, action, created_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_entries_workspace_actor_idx
  ON audit_entries (workspace_id, actor_user_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_entries_workspace_target_idx
  ON audit_entries (workspace_id, target_id)
  WHERE workspace_id IS NOT NULL;
