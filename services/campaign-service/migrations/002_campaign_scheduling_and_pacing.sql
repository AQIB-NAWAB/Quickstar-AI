-- Migration 002: Campaign scheduling, recipient timezone, pacing, and suppression registry
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS caller_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS agent_version_id UUID,
  ADD COLUMN IF NOT EXISTS timezone_mode VARCHAR(32) NOT NULL DEFAULT 'campaign'
    CHECK (timezone_mode IN ('campaign', 'recipient_local')),
  ADD COLUMN IF NOT EXISTS weekdays JSONB NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  ADD COLUMN IF NOT EXISTS held_contacts_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE campaign_targets
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64),
  ADD COLUMN IF NOT EXISTS timezone_provenance VARCHAR(32) NOT NULL DEFAULT 'provided',
  ADD COLUMN IF NOT EXISTS is_held BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS held_reason VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_held
  ON campaign_targets (campaign_id, is_held)
  WHERE is_held = true;

CREATE TABLE IF NOT EXISTS workspace_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  phone_normalized VARCHAR(32) NOT NULL,
  reason VARCHAR(64) NOT NULL DEFAULT 'opt_out'
    CHECK (reason IN ('opt_out', 'dnc_registry', 'manual', 'carrier_complaint')),
  source VARCHAR(64) NOT NULL DEFAULT 'caller',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_workspace_suppressions_lookup
  ON workspace_suppressions (workspace_id, phone_normalized);
