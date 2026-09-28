ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(1024),
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(128) DEFAULT 'text/plain';

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_storage_key ON knowledge_sources (storage_key)
  WHERE storage_key IS NOT NULL;
