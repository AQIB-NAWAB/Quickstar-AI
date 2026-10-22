-- 007_telephony_lifecycle_and_bindings.sql
-- Phone numbers binding and extended telephony lifecycle state machine

-- Drop existing restrictive state check constraint to allow standard telephony states
ALTER TABLE voice_calls
  DROP CONSTRAINT IF EXISTS voice_calls_state_check;

ALTER TABLE voice_calls
  ADD CONSTRAINT voice_calls_state_check
  CHECK (state IN (
    'queued', 'initiated', 'ringing', 'live', 'in_progress',
    'completed', 'busy', 'no_answer', 'canceled', 'failed',
    'transferred', 'reconciliation_required'
  ));

ALTER TABLE voice_calls
  ADD COLUMN IF NOT EXISTS provider_call_sid VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS stream_sid VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS recording_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amd_status VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS hangup_cause VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS phone_number_id UUID NULL,
  ADD COLUMN IF NOT EXISTS custom_parameters JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_voice_calls_provider_call_sid
  ON voice_calls (provider_call_sid)
  WHERE provider_call_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_calls_stream_sid
  ON voice_calls (stream_sid)
  WHERE stream_sid IS NOT NULL;

CREATE TABLE IF NOT EXISTS workspace_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  friendly_name VARCHAR(128) NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'twilio',
  provider_sid VARCHAR(128) NULL,
  assigned_agent_id UUID NULL,
  inbound_webhook_url TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  capabilities JSONB NOT NULL DEFAULT '{"voice":true,"sms":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_phone_number UNIQUE (workspace_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_workspace_phone_numbers_number
  ON workspace_phone_numbers (phone_number);

CREATE INDEX IF NOT EXISTS idx_workspace_phone_numbers_workspace
  ON workspace_phone_numbers (workspace_id, status);
