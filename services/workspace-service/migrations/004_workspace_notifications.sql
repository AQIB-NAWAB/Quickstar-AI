-- Migration 004: Workspace Notifications Table
CREATE TABLE IF NOT EXISTS workspace_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  recipient_user_id UUID,
  category TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'info',
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  source_name TEXT,
  action_url TEXT,
  action_label TEXT,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  deduplication_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_notifications_ws_created
  ON workspace_notifications (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_notifications_ws_unread
  ON workspace_notifications (workspace_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_notifications_category
  ON workspace_notifications (workspace_id, category, created_at DESC);
