-- Migration 004: Knowledge asynchronous extraction and durable queue

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(32) NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS extraction_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS ocr_applied BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS knowledge_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT NULL,
  lease_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_extraction_queue_lease
  ON knowledge_extraction_queue (status, lease_expires_at, created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_extraction_source
  ON knowledge_extraction_queue (source_id);
