-- Migration 005: Webhook Subscriptions, Deliveries, and Attempts
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  signing_secret TEXT NOT NULL,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'failed',
  attempts_count INTEGER NOT NULL DEFAULT 1,
  last_http_status INTEGER,
  last_latency_ms INTEGER,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  http_status INTEGER,
  latency_ms INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  error TEXT,
  request_headers JSONB,
  response_headers JSONB,
  response_body TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_workspace
  ON webhook_endpoints (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON webhook_deliveries (webhook_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_workspace
  ON webhook_deliveries (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_delivery
  ON webhook_delivery_attempts (delivery_id, attempt_number ASC);
