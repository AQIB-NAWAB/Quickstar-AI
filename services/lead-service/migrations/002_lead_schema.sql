-- Workspace-level lead schema (schema-as-data). One row per workspace.
-- Custom fields live on leads.captured_fields; schema only describes keys/roles/labels.

CREATE TABLE IF NOT EXISTS workspace_lead_settings (
  workspace_id UUID PRIMARY KEY,
  lead_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
