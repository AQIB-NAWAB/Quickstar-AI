-- Feature 19: transactional outbox + idempotent consumer bookkeeping (v1)

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  request_id VARCHAR(128) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_unpublished
  ON outbox_events (created_at ASC)
  WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS event_consumer_receipts (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_handoff_metrics (
  workspace_id UUID PRIMARY KEY,
  handoff_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
