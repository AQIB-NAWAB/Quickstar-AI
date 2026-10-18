-- 006_agent_canvas_graph.sql
-- Add Visual Agent Builder Canvas graph persistence, schema versioning, builder mode, and release notes

ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS builder_mode VARCHAR(32) NOT NULL DEFAULT 'legacy',
    ADD COLUMN IF NOT EXISTS draft_graph JSONB NULL,
    ADD COLUMN IF NOT EXISTS graph_schema_version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_agents_workspace_builder_mode
    ON agents(workspace_id, builder_mode);

ALTER TABLE agent_versions
    ADD COLUMN IF NOT EXISTS release_notes TEXT NULL;
