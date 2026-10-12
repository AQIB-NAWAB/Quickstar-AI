CREATE TABLE IF NOT EXISTS voice_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  agent_id UUID NOT NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'scheduled', 'running', 'paused', 'completed')),
  concurrency_cap INTEGER NOT NULL DEFAULT 5,
  telephony_provider VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_campaigns_workspace
  ON voice_campaigns (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS voice_campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES voice_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dialing', 'completed', 'failed', 'skipped')),
  idempotency_key TEXT NOT NULL,
  call_id UUID,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_voice_campaign_targets_claim
  ON voice_campaign_targets (campaign_id, status);
