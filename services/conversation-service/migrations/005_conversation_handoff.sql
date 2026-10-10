-- Feature 18: inbox / human handoff state on conversations

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS state VARCHAR(32) NOT NULL DEFAULT 'bot',
  ADD COLUMN IF NOT EXISTS assignee_user_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_state_updated
  ON conversations (workspace_id, state, updated_at DESC);
