-- Feature F11 — Evaluation Suite v2 Migration
-- Datasets, Snapshots, Policy-based runs, Fixture execution, and Comparisons

CREATE TABLE IF NOT EXISTS eval_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(2000),
  tags TEXT[] NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  record_version INTEGER NOT NULL DEFAULT 1,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_datasets_workspace_agent
  ON eval_datasets (workspace_id, agent_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_datasets_workspace_active
  ON eval_datasets (workspace_id, archived_at, updated_at DESC);

-- Evolve eval_cases
ALTER TABLE eval_cases
  ADD COLUMN IF NOT EXISTS dataset_id UUID,
  ADD COLUMN IF NOT EXISTS expected_tools JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fixture_responses JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS record_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create default dataset for legacy cases
INSERT INTO eval_datasets (id, workspace_id, agent_id, name, description, tags, revision)
SELECT DISTINCT
  gen_random_uuid(),
  ec.workspace_id,
  ec.agent_id,
  'Default Dataset',
  'Migrated legacy evaluation cases',
  ARRAY['legacy'],
  1
FROM eval_cases ec
WHERE ec.dataset_id IS NULL
ON CONFLICT DO NOTHING;

-- Link legacy cases to default datasets
UPDATE eval_cases ec
SET dataset_id = ed.id
FROM eval_datasets ed
WHERE ec.dataset_id IS NULL
  AND ed.workspace_id = ec.workspace_id
  AND ed.agent_id = ec.agent_id
  AND ed.name = 'Default Dataset';

CREATE INDEX IF NOT EXISTS idx_eval_cases_dataset
  ON eval_cases (workspace_id, dataset_id, created_at ASC);

-- Dataset Snapshots (immutable per run)
CREATE TABLE IF NOT EXISTS eval_dataset_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  revision INTEGER NOT NULL,
  dataset_name VARCHAR(255) NOT NULL,
  cases JSONB NOT NULL DEFAULT '[]',
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_dataset_snapshots_lookup
  ON eval_dataset_snapshots (dataset_id, revision);

-- Evolve eval_runs
ALTER TABLE eval_runs
  ADD COLUMN IF NOT EXISTS dataset_id UUID,
  ADD COLUMN IF NOT EXISTS dataset_snapshot_id UUID,
  ADD COLUMN IF NOT EXISTS dataset_revision INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS policy JSONB NOT NULL DEFAULT '{"method":"exact_match","config":{},"scorer_version":"v1"}',
  ADD COLUMN IF NOT EXISTS fixture_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errored_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_latency_ms NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS token_usage JSONB,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fence_token VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_eval_runs_dataset
  ON eval_runs (workspace_id, dataset_id, created_at DESC);

-- Evolve eval_case_results
ALTER TABLE eval_case_results
  ADD COLUMN IF NOT EXISTS case_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS input TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_tools JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS actual_tools JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS score NUMERIC(6, 4),
  ADD COLUMN IF NOT EXISTS scoring_method VARCHAR(64) NOT NULL DEFAULT 'exact_match',
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS execution_error TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS token_usage JSONB;

-- Comparison Table
CREATE TABLE IF NOT EXISTS eval_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  baseline_run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  candidate_run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  dataset_id UUID,
  dataset_revision INTEGER,
  compatibility_fingerprint VARCHAR(128) NOT NULL,
  matched_case_count INTEGER NOT NULL DEFAULT 0,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  regressed_count INTEGER NOT NULL DEFAULT 0,
  unchanged_passed_count INTEGER NOT NULL DEFAULT 0,
  unchanged_failed_count INTEGER NOT NULL DEFAULT 0,
  baseline_pass_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  candidate_pass_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  delta_percentage_points NUMERIC(6, 2) NOT NULL DEFAULT 0,
  latency_delta_ms NUMERIC(10, 2),
  categories_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eval_comparisons_unique
  ON eval_comparisons (workspace_id, baseline_run_id, candidate_run_id);

CREATE INDEX IF NOT EXISTS idx_eval_comparisons_agent
  ON eval_comparisons (workspace_id, agent_id, created_at DESC);
