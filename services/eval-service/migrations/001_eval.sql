-- Feature 25 — Evaluation harness tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL DEFAULT '',
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_cases_workspace_agent
  ON eval_cases (workspace_id, agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  agent_version_id UUID NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  case_count INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(8, 2),
  idempotency_key VARCHAR(128),
  error TEXT,
  claimed_by VARCHAR(128),
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eval_runs_workspace_idempotency
  ON eval_runs (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eval_runs_workspace_created
  ON eval_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_runs_claim
  ON eval_runs (status, claimed_at)
  WHERE status = 'queued';

CREATE TABLE IF NOT EXISTS eval_run_cases (
  run_id UUID NOT NULL REFERENCES eval_runs (id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  PRIMARY KEY (run_id, case_id)
);

CREATE TABLE IF NOT EXISTS eval_case_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eval_runs (id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  expected_output TEXT NOT NULL,
  actual_output TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_case_results_run
  ON eval_case_results (run_id, workspace_id);
