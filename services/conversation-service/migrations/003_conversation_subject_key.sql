-- Feature 14: optional end-user identity for memory reads on turn path
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS subject_key VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_subject_key
  ON conversations (workspace_id, subject_key)
  WHERE subject_key IS NOT NULL;
