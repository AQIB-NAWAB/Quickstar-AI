import type { Pool } from "pg";

export type WorkspaceIntegrationRow = {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  account_identifier: string | null;
  account_email: string | null;
  account_name?: string | null;
  provider_account_id?: string | null;
  granted_scopes: string[];
  metadata: Record<string, unknown>;
  secret_reference_id: string | null;
  connected_at: Date | null;
  updated_at: Date;
  last_verified_at?: Date | null;
  last_sync_at?: Date | null;
  last_error?: string | null;
  token_expires_at?: Date | null;
  revision?: number;
  disconnected_at?: Date | null;
};

export type SyncLogRow = {
  id: string;
  workspace_id: string;
  provider: string;
  operation: string;
  status: string;
  records_synced: number;
  duration_ms: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
};

export type OAuthStateRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  provider: string;
  state_token: string;
  code_verifier: string | null;
  redirect_uri: string;
  expires_at: Date;
  created_at: Date;
};

export type WorkspaceEmailCampaignRow = {
  workspace_id: string;
  provider: string;
  campaign_id: string;
  audience_id: string | null;
  subject: string | null;
  created_by: string | null;
  recipient_emails: string[];
  lead: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export class IntegrationsRepository {
  constructor(private readonly pool: Pool) {}

  async listByWorkspace(workspaceId: string): Promise<WorkspaceIntegrationRow[]> {
    const res = await this.pool.query<WorkspaceIntegrationRow>(
      `SELECT * FROM workspace_integrations
       WHERE workspace_id = $1
       ORDER BY provider ASC`,
      [workspaceId],
    );
    return res.rows;
  }

  async getByProvider(
    workspaceId: string,
    provider: string,
  ): Promise<WorkspaceIntegrationRow | null> {
    const res = await this.pool.query<WorkspaceIntegrationRow>(
      `SELECT * FROM workspace_integrations
       WHERE workspace_id = $1 AND provider = $2`,
      [workspaceId, provider],
    );
    return res.rows[0] ?? null;
  }

  async saveEmailCampaign(params: {
    workspaceId: string;
    provider: string;
    campaignId: string;
    audienceId?: string | null;
    subject?: string | null;
    createdBy?: string | null;
    recipientEmails?: string[];
    lead?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO workspace_email_campaigns (
         workspace_id, provider, campaign_id, audience_id, subject, created_by,
         recipient_emails, lead, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9::jsonb)
       ON CONFLICT (workspace_id, provider, campaign_id) DO UPDATE SET
         audience_id = EXCLUDED.audience_id,
         subject = EXCLUDED.subject,
         recipient_emails = EXCLUDED.recipient_emails,
         lead = EXCLUDED.lead,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      [
        params.workspaceId,
        params.provider,
        params.campaignId,
        params.audienceId ?? null,
        params.subject ?? null,
        params.createdBy ?? null,
        params.recipientEmails ?? [],
        params.lead ? JSON.stringify(params.lead) : null,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  }

  async getEmailCampaign(
    workspaceId: string,
    provider: string,
    campaignId: string,
  ): Promise<WorkspaceEmailCampaignRow | null> {
    const res = await this.pool.query<WorkspaceEmailCampaignRow>(
      `SELECT * FROM workspace_email_campaigns
       WHERE workspace_id = $1 AND provider = $2 AND campaign_id = $3`,
      [workspaceId, provider, campaignId],
    );
    return res.rows[0] ?? null;
  }

  async listEmailCampaignIds(workspaceId: string, provider: string): Promise<string[]> {
    const res = await this.pool.query<{ campaign_id: string }>(
      `SELECT campaign_id FROM workspace_email_campaigns
       WHERE workspace_id = $1 AND provider = $2
       ORDER BY created_at DESC`,
      [workspaceId, provider],
    );
    return res.rows.map((row) => row.campaign_id);
  }

  async listEmailCampaigns(
    workspaceId: string,
    provider: string,
  ): Promise<WorkspaceEmailCampaignRow[]> {
    const res = await this.pool.query<WorkspaceEmailCampaignRow>(
      `SELECT * FROM workspace_email_campaigns
       WHERE workspace_id = $1 AND provider = $2
       ORDER BY created_at DESC`,
      [workspaceId, provider],
    );
    return res.rows;
  }

  async markEmailCampaignSent(
    workspaceId: string,
    provider: string,
    campaignId: string,
    sentBy?: string | null,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE workspace_email_campaigns
       SET metadata = COALESCE(metadata, '{}'::jsonb) ||
                      jsonb_build_object(
                        'sent_at', to_jsonb(now()),
                        'sent_by', to_jsonb($4::text)
                      ),
           updated_at = now()
       WHERE workspace_id = $1 AND provider = $2 AND campaign_id = $3`,
      [workspaceId, provider, campaignId, sentBy ?? null],
    );
  }

  async deleteEmailCampaign(
    workspaceId: string,
    provider: string,
    campaignId: string,
  ): Promise<void> {
    await this.pool.query(
      `DELETE FROM workspace_email_campaigns
       WHERE workspace_id = $1 AND provider = $2 AND campaign_id = $3`,
      [workspaceId, provider, campaignId],
    );
  }

  async isEmailCampaignOwned(
    workspaceId: string,
    provider: string,
    campaignId: string,
  ): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM workspace_email_campaigns
       WHERE workspace_id = $1 AND provider = $2 AND campaign_id = $3
       LIMIT 1`,
      [workspaceId, provider, campaignId],
    );
    return res.rows.length > 0;
  }

  async upsertConnection(params: {
    workspaceId: string;
    provider: string;
    status: string;
    accountIdentifier?: string | null;
    accountEmail?: string | null;
    accountName?: string | null;
    providerAccountId?: string | null;
    grantedScopes?: string[];
    metadata?: Record<string, unknown>;
    secretReferenceId?: string | null;
    tokenExpiresAt?: Date | null;
    lastError?: string | null;
  }): Promise<WorkspaceIntegrationRow> {
    const res = await this.pool.query<WorkspaceIntegrationRow>(
      `INSERT INTO workspace_integrations (
         workspace_id, provider, status, account_identifier, account_email, account_name,
         provider_account_id, granted_scopes, metadata, secret_reference_id, token_expires_at,
         last_error, last_verified_at, connected_at, updated_at
       ) VALUES ($1, $2, $3::varchar, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, CASE WHEN $3::varchar = 'connected'::varchar THEN now() ELSE NULL END, CASE WHEN $3::varchar = 'connected'::varchar THEN now() ELSE NULL END, now())
       ON CONFLICT (workspace_id, provider) DO UPDATE SET
         status = EXCLUDED.status,
         account_identifier = COALESCE(EXCLUDED.account_identifier, workspace_integrations.account_identifier),
         account_email = COALESCE(EXCLUDED.account_email, workspace_integrations.account_email),
         account_name = COALESCE(EXCLUDED.account_name, workspace_integrations.account_name),
         provider_account_id = COALESCE(EXCLUDED.provider_account_id, workspace_integrations.provider_account_id),
         granted_scopes = EXCLUDED.granted_scopes,
         metadata = workspace_integrations.metadata || EXCLUDED.metadata,
         secret_reference_id = COALESCE(EXCLUDED.secret_reference_id, workspace_integrations.secret_reference_id),
         token_expires_at = COALESCE(EXCLUDED.token_expires_at, workspace_integrations.token_expires_at),
         last_error = EXCLUDED.last_error,
         last_verified_at = CASE WHEN EXCLUDED.status = 'connected' THEN now() ELSE workspace_integrations.last_verified_at END,
         connected_at = CASE WHEN EXCLUDED.status = 'connected' THEN now() ELSE workspace_integrations.connected_at END,
         revision = COALESCE(workspace_integrations.revision, 1) + 1,
         updated_at = now()
       RETURNING *`,
      [
        params.workspaceId,
        params.provider,
        params.status,
        params.accountIdentifier ?? null,
        params.accountEmail ?? null,
        params.accountName ?? null,
        params.providerAccountId ?? null,
        params.grantedScopes ?? [],
        JSON.stringify(params.metadata ?? {}),
        params.secretReferenceId ?? null,
        params.tokenExpiresAt ?? null,
        params.lastError ?? null,
      ],
    );
    return res.rows[0];
  }

  async saveOAuthState(params: {
    workspaceId: string;
    userId: string;
    provider: string;
    stateToken: string;
    codeVerifier?: string;
    redirectUri: string;
    expiresAt: Date;
  }): Promise<OAuthStateRow> {
    const res = await this.pool.query<OAuthStateRow>(
      `INSERT INTO workspace_integration_oauth_states (
         workspace_id, user_id, provider, state_token, code_verifier, redirect_uri, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        params.workspaceId,
        params.userId,
        params.provider,
        params.stateToken,
        params.codeVerifier ?? null,
        params.redirectUri,
        params.expiresAt,
      ],
    );
    return res.rows[0];
  }

  async getOAuthState(stateToken: string): Promise<OAuthStateRow | null> {
    const res = await this.pool.query<OAuthStateRow>(
      `SELECT * FROM workspace_integration_oauth_states
       WHERE state_token = $1 AND expires_at > now()`,
      [stateToken],
    );
    return res.rows[0] ?? null;
  }

  async deleteOAuthState(stateToken: string): Promise<void> {
    await this.pool.query(`DELETE FROM workspace_integration_oauth_states WHERE state_token = $1`, [
      stateToken,
    ]);
  }

  async deleteConnection(workspaceId: string, provider: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE workspace_integrations
       SET status = 'not_connected', disconnected_at = now(), secret_reference_id = NULL, updated_at = now()
       WHERE workspace_id = $1 AND provider = $2`,
      [workspaceId, provider],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async recordSyncLog(params: {
    workspaceId: string;
    provider: string;
    operation: string;
    status: "success" | "failed" | "running";
    recordsSynced: number;
    durationMs: number;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<SyncLogRow> {
    const res = await this.pool.query<SyncLogRow>(
      `INSERT INTO workspace_integration_sync_logs (
         workspace_id, provider, operation, status, records_synced, duration_ms, error_message, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING *`,
      [
        params.workspaceId,
        params.provider,
        params.operation,
        params.status,
        params.recordsSynced,
        params.durationMs,
        params.errorMessage ?? null,
        JSON.stringify(params.metadata ?? {}),
      ],
    );

    if (params.status === "success") {
      await this.pool.query(
        `UPDATE workspace_integrations
         SET last_sync_at = now(), last_error = NULL, updated_at = now()
         WHERE workspace_id = $1 AND provider = $2`,
        [params.workspaceId, params.provider],
      );
    } else if (params.status === "failed") {
      await this.pool.query(
        `UPDATE workspace_integrations
         SET last_error = $3, updated_at = now()
         WHERE workspace_id = $1 AND provider = $2`,
        [params.workspaceId, params.provider, params.errorMessage ?? "Sync error"],
      );
    }

    return res.rows[0];
  }

  async listSyncLogs(workspaceId: string, provider?: string, limit = 20): Promise<SyncLogRow[]> {
    if (provider) {
      const res = await this.pool.query<SyncLogRow>(
        `SELECT * FROM workspace_integration_sync_logs
         WHERE workspace_id = $1 AND provider = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [workspaceId, provider, limit],
      );
      return res.rows;
    }
    const res = await this.pool.query<SyncLogRow>(
      `SELECT * FROM workspace_integration_sync_logs
       WHERE workspace_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [workspaceId, limit],
    );
    return res.rows;
  }
}
