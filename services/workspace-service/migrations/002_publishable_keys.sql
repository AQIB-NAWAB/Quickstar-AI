-- 002_publishable_keys.sql — Feature 17 website widget keys

CREATE TABLE IF NOT EXISTS publishable_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    allowed_origins JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_agent_id UUID,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publishable_keys_workspace_id ON publishable_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_publishable_keys_key_prefix ON publishable_keys(key_prefix);
