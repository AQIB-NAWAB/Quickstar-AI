CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name VARCHAR(200),
  email VARCHAR(320),
  phone VARCHAR(32),
  intent VARCHAR(200),
  qualification_score NUMERIC(8, 2),
  qualification_max NUMERIC(8, 2),
  sentiment VARCHAR(32) NOT NULL DEFAULT 'unknown'
    CHECK (sentiment IN ('positive', 'neutral', 'negative', 'unknown')),
  status VARCHAR(32) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'disqualified')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  source VARCHAR(64) NOT NULL DEFAULT 'api',
  captured_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  conversation_id UUID,
  external_id VARCHAR(200),
  idempotency_key VARCHAR(128),
  version INTEGER NOT NULL DEFAULT 1,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_workspace_idempotency
  ON leads (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_workspace_external
  ON leads (workspace_id, external_id)
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_updated
  ON leads (workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_status
  ON leads (workspace_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_tags
  ON leads USING GIN (tags)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_phone
  ON leads (workspace_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_email
  ON leads (workspace_id, lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;
