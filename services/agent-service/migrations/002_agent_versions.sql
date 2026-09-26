-- Feature 08: Immutable agent versions and production pointer

CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    release_number INT NOT NULL,
    snapshot JSONB NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agent_versions_agent_release UNIQUE (agent_id, release_number)
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_workspace_agent_release
    ON agent_versions(workspace_id, agent_id, release_number DESC);

ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS production_version_id UUID NULL REFERENCES agent_versions(id);
