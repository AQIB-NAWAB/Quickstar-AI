import type { Pool } from "pg";

export type WorkspaceIntegrationRow = {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  account_identifier: string | null;
  account_email: string | null;
  granted_scopes: string[];
  metadata: Record<string, unknown>;
  secret_reference_id: string | null;
  connected_at: Date | null;
  updated_at: Date;
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

  async upsertConnection(params: {
    workspaceId: string;
    provider: string;
    status: string;
    accountIdentifier?: string | null;
    accountEmail?: string | null;
    grantedScopes?: string[];
    metadata?: Record<string, unknown>;
    secretReferenceId?: string | null;
  }): Promise<WorkspaceIntegrationRow> {
    const res = await this.pool.query<WorkspaceIntegrationRow>(
      `INSERT INTO workspace_integrations (
         workspace_id, provider, status, account_identifier, account_email,
         granted_scopes, metadata, secret_reference_id, connected_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, CASE WHEN $3 = 'connected' THEN now() ELSE NULL END, now())
       ON CONFLICT (workspace_id, provider) DO UPDATE SET
         status = EXCLUDED.status,
         account_identifier = COALESCE(EXCLUDED.account_identifier, workspace_integrations.account_identifier),
         account_email = COALESCE(EXCLUDED.account_email, workspace_integrations.account_email),
         granted_scopes = EXCLUDED.granted_scopes,
         metadata = workspace_integrations.metadata || EXCLUDED.metadata,
         secret_reference_id = COALESCE(EXCLUDED.secret_reference_id, workspace_integrations.secret_reference_id),
         connected_at = CASE WHEN EXCLUDED.status = 'connected' THEN now() ELSE workspace_integrations.connected_at END,
         updated_at = now()
       RETURNING *`,
      [
        params.workspaceId,
        params.provider,
        params.status,
        params.accountIdentifier ?? null,
        params.accountEmail ?? null,
        params.grantedScopes ?? [],
        JSON.stringify(params.metadata ?? {}),
        params.secretReferenceId ?? null,
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
    await this.pool.query(
      `DELETE FROM workspace_integration_oauth_states WHERE state_token = $1`,
      [stateToken],
    );
  }

  async deleteConnection(workspaceId: string, provider: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM workspace_integrations WHERE workspace_id = $1 AND provider = $2`,
      [workspaceId, provider],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
