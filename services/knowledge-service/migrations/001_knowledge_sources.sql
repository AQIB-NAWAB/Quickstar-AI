CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'text',
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  error_message TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  content_text TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace ON knowledge_sources (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace_status ON knowledge_sources (workspace_id, status);
