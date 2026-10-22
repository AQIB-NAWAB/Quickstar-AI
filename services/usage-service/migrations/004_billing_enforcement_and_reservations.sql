-- Migration 004: Billing Enforcement, Reservations, Credits, and Webhook Idempotency

-- Add org_id to usage_entries if not present
ALTER TABLE usage_entries
  ADD COLUMN IF NOT EXISTS org_id UUID NULL;

CREATE INDEX IF NOT EXISTS usage_entries_org_created_idx
  ON usage_entries (org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

-- Atomic budget reservations for concurrency control
CREATE TABLE IF NOT EXISTS usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  kind VARCHAR(32) NOT NULL CHECK (kind IN ('tokens', 'voice')),
  units_reserved BIGINT NOT NULL CHECK (units_reserved >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'committed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_reservations_active
  ON usage_reservations (org_id, kind, status, expires_at)
  WHERE status = 'active';

-- Immutable billing credits ledger
CREATE TABLE IF NOT EXISTS billing_credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL,
  reason TEXT NOT NULL,
  actor_user_id VARCHAR(128) NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_credits_org
  ON billing_credits_ledger (org_id, created_at DESC);

-- Spend controls and warning thresholds
CREATE TABLE IF NOT EXISTS billing_spend_controls (
  org_id UUID PRIMARY KEY,
  hard_spend_cap_cents BIGINT NULL,
  warning_threshold_percent INTEGER NOT NULL DEFAULT 80,
  overage_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stripe webhook idempotency and event sequence tracking
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(128) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  event_created_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'processed',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add sequence and event tracking to organization_subscriptions
ALTER TABLE organization_subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_created_at TIMESTAMPTZ NULL;
