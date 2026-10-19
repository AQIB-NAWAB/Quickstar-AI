-- Migration 003: Campaign attempts durable audit and reconciliation ledger

ALTER TABLE campaign_attempts
  ADD COLUMN IF NOT EXISTS provider VARCHAR(32) NOT NULL DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS provider_call_sid VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS amd_result VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS hangup_cause VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS error_message TEXT NULL,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'clean';

ALTER TABLE campaign_attempts DROP CONSTRAINT IF EXISTS campaign_attempts_status_check;
ALTER TABLE campaign_attempts ADD CONSTRAINT campaign_attempts_status_check
  CHECK (status IN (
    'dispatch_pending', 'in_progress', 'dialing', 'ringing', 'answered',
    'busy', 'no_answer', 'voicemail', 'failed', 'completed', 'canceled'
  ));

CREATE INDEX IF NOT EXISTS idx_campaign_attempts_campaign_status
  ON campaign_attempts (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_campaign_attempts_provider_call_sid
  ON campaign_attempts (provider_call_sid)
  WHERE provider_call_sid IS NOT NULL;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS active_dispatches_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concurrent_calls_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS calls_per_minute INTEGER NOT NULL DEFAULT 30;

ALTER TABLE campaign_targets
  ADD COLUMN IF NOT EXISTS active_call_sid VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ NULL;
