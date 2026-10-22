-- Migration 003: Worker leases, heartbeats, fencing, and execution lineage

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS lease_owner VARCHAR(128),
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Ensure workflow_runs status check includes 'queued' and 'canceled'
DO $$
BEGIN
  ALTER TABLE workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_status_check;
  ALTER TABLE workflow_runs ADD CONSTRAINT workflow_runs_status_check
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped', 'canceled'));
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Index for abandoned run recovery: running runs whose lease has expired
CREATE INDEX IF NOT EXISTS idx_workflow_runs_lease_recovery
  ON workflow_runs (workspace_id, status, lease_expires_at)
  WHERE status = 'running';

-- Index for cursor pagination and date range queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_cursor_pagination
  ON workflow_runs (workspace_id, triggered_at DESC, id DESC);

-- Ensure workflow_run_steps status check includes 'pending' and 'canceled'
DO $$
BEGIN
  ALTER TABLE workflow_run_steps DROP CONSTRAINT IF EXISTS workflow_run_steps_status_check;
  ALTER TABLE workflow_run_steps ADD CONSTRAINT workflow_run_steps_status_check
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped', 'canceled'));
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add step attempt and idempotency key columns to workflow_run_steps
ALTER TABLE workflow_run_steps
  ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(256);

-- Index for step idempotency lookups
CREATE INDEX IF NOT EXISTS idx_workflow_run_steps_idempotency
  ON workflow_run_steps (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
