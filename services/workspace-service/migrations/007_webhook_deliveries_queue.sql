-- Migration 007: Webhook Deliveries Durable Queue, Fencing, and Dead-Lettering
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS canonical_event_id TEXT,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lease_owner TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dead_letter_reason TEXT,
  ADD COLUMN IF NOT EXISTS fencing_token INTEGER NOT NULL DEFAULT 1;

-- Ensure endpoint and canonical event deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_event
  ON webhook_deliveries (webhook_id, canonical_event_id)
  WHERE canonical_event_id IS NOT NULL;

-- Queue claim index for background delivery workers
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_claim
  ON webhook_deliveries (status, next_attempt_at ASC)
  WHERE status IN ('pending', 'running');

-- Unique attempt per delivery
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_delivery_attempt
  ON webhook_delivery_attempts (delivery_id, attempt_number);
