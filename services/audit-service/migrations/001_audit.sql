-- Feature 27 — append-only audit trail
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  org_id UUID,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_entries_scope_check CHECK (
    workspace_id IS NOT NULL OR org_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS audit_entries_workspace_created_idx
  ON audit_entries (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_entries_org_created_idx
  ON audit_entries (org_id, created_at DESC)
  WHERE org_id IS NOT NULL;
