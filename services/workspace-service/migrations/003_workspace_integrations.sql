-- Migration 003: Workspace Integrations & OAuth Lifecycle
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workspace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (
    status IN ('not_connected', 'connecting', 'connected', 'needs_reauthorization', 'incomplete', 'error')
  ),
  account_identifier TEXT,
  account_email TEXT,
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_reference_id UUID,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_integrations_workspace_provider_unique UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_workspace_id
  ON workspace_integrations (workspace_id);

CREATE TABLE IF NOT EXISTS workspace_integration_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  provider VARCHAR(64) NOT NULL,
  state_token VARCHAR(128) NOT NULL UNIQUE,
  code_verifier VARCHAR(128),
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_integration_oauth_states_token
  ON workspace_integration_oauth_states (state_token);
