-- Migration 002: Analytics rollups and query performance indexes
CREATE INDEX IF NOT EXISTS usage_entries_workspace_kind_created_idx
  ON usage_entries (workspace_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS usage_entries_analytics_rollup_idx
  ON usage_entries (workspace_id, created_at, kind, provider, model);
