CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused')),
  trigger_event_type VARCHAR(128) NOT NULL,
  condition_group JSONB,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_workspace_status
  ON workflow_definitions (workspace_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_workspace_trigger
  ON workflow_definitions (workspace_id, trigger_event_type)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
  definition_version INTEGER NOT NULL,
  event_id UUID NOT NULL,
  trigger_event_type VARCHAR(128) NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed', 'skipped')),
  current_step_index INTEGER NOT NULL DEFAULT 0,
  steps_total INTEGER NOT NULL DEFAULT 0,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  error JSONB,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (workflow_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workspace_workflow_triggered
  ON workflow_runs (workspace_id, workflow_id, triggered_at DESC);

CREATE TABLE IF NOT EXISTS workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  step_index INTEGER NOT NULL,
  step_id VARCHAR(128) NOT NULL,
  step_name VARCHAR(200) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL
    CHECK (status IN ('running', 'succeeded', 'failed', 'skipped')),
  summary TEXT NOT NULL DEFAULT '',
  inputs JSONB,
  output JSONB,
  error JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  UNIQUE (run_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_run_steps_run
  ON workflow_run_steps (run_id, step_index);

CREATE TABLE IF NOT EXISTS workflow_side_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  step_id VARCHAR(128) NOT NULL,
  effect_kind VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_side_effects_workspace_event
  ON workflow_side_effects (workspace_id, event_id);

CREATE TABLE IF NOT EXISTS workflow_dead_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  event_id UUID,
  event_type VARCHAR(128),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_dead_letters_created
  ON workflow_dead_letters (created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_processed_events (
  event_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
