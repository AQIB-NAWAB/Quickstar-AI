-- 008_invitation_lifecycle.sql
-- Add accepted_at and accepted_by to workspace_invites and create index on token_hash

ALTER TABLE workspace_invites ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE workspace_invites ADD COLUMN IF NOT EXISTS accepted_by UUID;
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token_hash ON workspace_invites(token_hash);
