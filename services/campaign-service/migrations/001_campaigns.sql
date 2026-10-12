CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  agent_id UUID NOT NULL,
  agent_name VARCHAR(200) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed')),
  audience_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  pacing JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key VARCHAR(128),
  version INTEGER NOT NULL DEFAULT 1,
  scheduled_start TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_status
  ON campaigns (workspace_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_updated
  ON campaigns (workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  dial_address VARCHAR(32) NOT NULL,
  dial_normalized VARCHAR(32) NOT NULL,
  display_name VARCHAR(200),
  email VARCHAR(320),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_kind VARCHAR(32) NOT NULL DEFAULT 'csv'
    CHECK (source_kind IN ('csv', 'lead', 'api')),
  source_ref VARCHAR(200),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'queued', 'calling', 'answered', 'no_answer', 'busy',
      'voicemail', 'retrying', 'opted_out', 'failed', 'completed'
    )),
  attempts_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  outcome VARCHAR(64),
  claimed_at TIMESTAMPTZ,
  claimed_by VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, dial_normalized)
);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_claim
  ON campaign_targets (campaign_id, status, next_attempt_at NULLS FIRST, created_at);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_workspace_campaign_status
  ON campaign_targets (workspace_id, campaign_id, status);

CREATE TABLE IF NOT EXISTS campaign_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES campaign_targets(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  idempotency_key VARCHAR(200) NOT NULL,
  call_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('answered', 'no_answer', 'busy', 'failed', 'in_progress', 'voicemail')),
  outcome VARCHAR(64) NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  error JSONB,
  UNIQUE (idempotency_key),
  UNIQUE (campaign_id, target_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_campaign_attempts_campaign_started
  ON campaign_attempts (workspace_id, campaign_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_attempts_target
  ON campaign_attempts (target_id, attempt_number);
