-- Feature F11.3 — Evaluation Gates, Scorer Unavailability Disclosures, and Audit
-- Supports regression gate enforcement, tracking unavailable scorers separately from failures,
-- and immutable audit logging for promotional gate overrides.

ALTER TABLE eval_runs
  ADD COLUMN IF NOT EXISTS unavailable_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;

ALTER TABLE eval_case_results
  ADD COLUMN IF NOT EXISTS scorer_unavailable BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS eval_gate_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  agent_version_id UUID NOT NULL,
  gate_passed BOOLEAN NOT NULL,
  blocked BOOLEAN NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  overridden BOOLEAN NOT NULL DEFAULT FALSE,
  override_actor_id UUID,
  override_reason TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_gate_audits_agent
  ON eval_gate_audits (workspace_id, agent_id, created_at DESC);
