-- Migration 009: Per-workspace ownership for account-level provider campaigns.
-- Mailchimp campaigns live on the connected account, not the workspace, so a
-- shared account would otherwise show every workspace's campaigns everywhere.
CREATE TABLE IF NOT EXISTS workspace_email_campaigns (
  workspace_id UUID NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'mailchimp',
  campaign_id VARCHAR(64) NOT NULL,
  audience_id VARCHAR(64),
  subject TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, provider, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_email_campaigns_workspace_created
  ON workspace_email_campaigns (workspace_id, created_at DESC);
