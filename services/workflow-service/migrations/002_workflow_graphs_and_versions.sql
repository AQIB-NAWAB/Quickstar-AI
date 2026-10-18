-- Add draft_graph, settings, and active_version tracking to workflow_definitions
ALTER TABLE workflow_definitions
  ADD COLUMN IF NOT EXISTS draft_graph JSONB,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS active_version_id UUID,
  ADD COLUMN IF NOT EXISTS active_version_number INTEGER;

-- Create immutable workflow_versions table for activated releases
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  definition_snapshot JSONB NOT NULL,
  settings_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  graph_snapshot JSONB NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_by_user_id UUID,
  UNIQUE (workflow_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_workspace_workflow
  ON workflow_versions (workspace_id, workflow_id, version_number DESC);

-- Alter foreign key constraint for active_version_id if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_workflow_definitions_active_version'
  ) THEN
    ALTER TABLE workflow_definitions
      ADD CONSTRAINT fk_workflow_definitions_active_version
      FOREIGN KEY (active_version_id)
      REFERENCES workflow_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Extend workflow_runs with execution mode, version reference, replay linkage, and error handling
ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES workflow_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS definition_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(32) NOT NULL DEFAULT 'live'
    CHECK (mode IN ('live', 'dry_run')),
  ADD COLUMN IF NOT EXISTS replay_of_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handled_errors BOOLEAN NOT NULL DEFAULT false;

-- Create 2-phase action journal for external I/O idempotency & worker claims
CREATE TABLE IF NOT EXISTS workflow_action_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id VARCHAR(128) NOT NULL,
  operation_key VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dispatching', 'succeeded', 'failed', 'uncertain')),
  attempts INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, node_id, operation_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_action_journal_op
  ON workflow_action_journal (workspace_id, operation_key);
