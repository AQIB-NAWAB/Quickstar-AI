-- 008_inbound_numbers_livekit.sql
-- Platform-owned number inventory, Telnyx provisioning state, and LiveKit inbound routing.

-- Platform-pool numbers have no workspace until a customer rents them.
ALTER TABLE workspace_phone_numbers
  ALTER COLUMN workspace_id DROP NOT NULL;

ALTER TABLE workspace_phone_numbers
  DROP CONSTRAINT IF EXISTS uq_workspace_phone_number;

ALTER TABLE workspace_phone_numbers
  ADD COLUMN IF NOT EXISTS provider_number_id VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS provider_connection_id VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS country_code CHAR(2) NULL,
  ADD COLUMN IF NOT EXISTS number_type VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS region VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS locality VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10, 4) NULL,
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NULL,
  ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS livekit_trunk_id VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS livekit_dispatch_rule_id VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS inbound_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provisioning_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- One Telnyx number belongs to exactly one platform account.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_phone_numbers_e164
  ON workspace_phone_numbers (phone_number);

CREATE INDEX IF NOT EXISTS idx_workspace_phone_numbers_pool
  ON workspace_phone_numbers (status, inbound_status)
  WHERE workspace_id IS NULL;

-- Inbound call correlation with LiveKit.
ALTER TABLE voice_calls
  ADD COLUMN IF NOT EXISTS livekit_room_name VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS livekit_participant_sid VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS phone_number_id UUID NULL,
  ADD COLUMN IF NOT EXISTS sip_call_id VARCHAR(128) NULL;

CREATE INDEX IF NOT EXISTS idx_voice_calls_livekit_room
  ON voice_calls (livekit_room_name)
  WHERE livekit_room_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_calls_sip_call_id
  ON voice_calls (sip_call_id)
  WHERE sip_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_calls_phone_number
  ON voice_calls (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

-- Long-lived platform provisioning state (Telnyx FQDN connection id, etc.).
CREATE TABLE IF NOT EXISTS voice_platform_config (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
