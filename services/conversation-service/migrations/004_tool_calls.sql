CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  turn_idempotency_key VARCHAR(255) NOT NULL,
  tool_call_key VARCHAR(512) NOT NULL,
  tool_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  request_json JSONB,
  response_json JSONB,
  error_code VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tool_calls_workspace_key UNIQUE (workspace_id, tool_call_key)
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_conversation_turn
  ON tool_calls (workspace_id, conversation_id, turn_idempotency_key);
