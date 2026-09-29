CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  subject_key VARCHAR(255) NOT NULL,
  fact_key VARCHAR(128),
  fact_text TEXT NOT NULL,
  created_by_actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_facts_workspace_subject
  ON memory_facts (workspace_id, subject_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_facts_workspace_subject_fact_key
  ON memory_facts (workspace_id, subject_key, fact_key)
  WHERE fact_key IS NOT NULL;
