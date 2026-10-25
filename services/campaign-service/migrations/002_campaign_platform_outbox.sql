-- Campaign completion events share the platform transactional outbox.
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
