-- Migration 011: SMTP email campaign module.
-- Workspace-scoped sending mailboxes (Google app passwords), campaigns with
-- fixed recipients, per-recipient personalized emails, follow-ups, activity
-- history, and a workspace-wide suppression list. Sending is SMTP-only:
-- no reply/open/click tracking, no bounce inbox.

CREATE TABLE IF NOT EXISTS smtp_mailboxes (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  email VARCHAR(320) NOT NULL,
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  secret_reference_id VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  daily_limit INT NOT NULL DEFAULT 50,
  sent_date DATE,
  sent_today INT NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_smtp_mailboxes_workspace
  ON smtp_mailboxes (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS smtp_email_campaigns (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  mode VARCHAR(16) NOT NULL DEFAULT 'generic',
  mailbox_id UUID REFERENCES smtp_mailboxes(id) ON DELETE SET NULL,
  from_name VARCHAR(120),
  subject VARCHAR(200),
  preview_text VARCHAR(200),
  html TEXT,
  brief TEXT,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_start_at TIMESTAMPTZ,
  recipients_fixed BOOLEAN NOT NULL DEFAULT false,
  consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  followup_step INT NOT NULL DEFAULT 0,
  created_by UUID,
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  last_error TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smtp_email_campaigns_workspace
  ON smtp_email_campaigns (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_smtp_email_campaigns_status
  ON smtp_email_campaigns (status)
  WHERE status IN ('scheduled', 'sending');

CREATE TABLE IF NOT EXISTS smtp_email_recipients (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES smtp_email_campaigns(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  name VARCHAR(200),
  company VARCHAR(200),
  website VARCHAR(500),
  category VARCHAR(120),
  location VARCHAR(200),
  summary TEXT,
  notes TEXT,
  lead JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  personalized JSONB,
  sent_subject TEXT,
  sent_html TEXT,
  followup_step INT NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  claimed_by VARCHAR(64),
  lease_expires_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  message_id VARCHAR(512),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_smtp_email_recipients_due
  ON smtp_email_recipients (next_send_at ASC)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_smtp_email_recipients_campaign
  ON smtp_email_recipients (campaign_id);

CREATE TABLE IF NOT EXISTS smtp_email_activity (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  campaign_id UUID REFERENCES smtp_email_campaigns(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smtp_email_activity_campaign
  ON smtp_email_activity (campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS smtp_suppressions (
  workspace_id UUID NOT NULL,
  email VARCHAR(320) NOT NULL,
  reason VARCHAR(24) NOT NULL DEFAULT 'opted_out',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, email)
);
