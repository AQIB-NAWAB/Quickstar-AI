-- Add rich metadata columns for Knowledge sources (URL import, file upload, extracted text size, and indexed version tracking)
ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS char_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS indexed_version INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_storage_key VARCHAR(1024);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace_kind
  ON knowledge_sources (workspace_id, kind);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace_updated
  ON knowledge_sources (workspace_id, updated_at DESC, id DESC);
