-- Feature 26 — append-only usage ledger
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usage_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('model', 'acquisition', 'voice')),
  units NUMERIC NOT NULL CHECK (units >= 0),
  unit_label TEXT,
  provider TEXT,
  model TEXT,
  price_micros BIGINT NOT NULL DEFAULT 0 CHECK (price_micros >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  idempotency_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  source_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usage_entries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS usage_entries_workspace_created_idx
  ON usage_entries (workspace_id, created_at DESC);
