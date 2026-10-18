-- 007_flow_sessions_and_traces.sql
-- Feature: Visual Canvas Graph Flow Sessions and Execution Traces

CREATE TABLE IF NOT EXISTS flow_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    release_id UUID NULL,
    channel VARCHAR(32) NOT NULL DEFAULT 'chat',
    is_preview BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    current_node_id VARCHAR(255) NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    wait_state JSONB NULL,
    pending_action JSONB NULL,
    handoff_state JSONB NULL,
    turn_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_flow_sessions_conv UNIQUE (conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_flow_sessions_workspace_agent
    ON flow_sessions(workspace_id, agent_id, status);

CREATE INDEX IF NOT EXISTS idx_flow_sessions_workspace_preview
    ON flow_sessions(workspace_id, is_preview, updated_at DESC);

CREATE TABLE IF NOT EXISTS flow_execution_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES flow_sessions(id) ON DELETE CASCADE,
    run_id VARCHAR(255) NOT NULL,
    turn_index INT NOT NULL DEFAULT 1,
    node_id VARCHAR(255) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    node_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    chosen_branch_port VARCHAR(255) NULL,
    inputs JSONB NULL,
    outputs JSONB NULL,
    error TEXT NULL,
    duration_ms INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_flow_traces_session_started
    ON flow_execution_traces(session_id, started_at ASC);

CREATE INDEX IF NOT EXISTS idx_flow_traces_run_id
    ON flow_execution_traces(run_id);
