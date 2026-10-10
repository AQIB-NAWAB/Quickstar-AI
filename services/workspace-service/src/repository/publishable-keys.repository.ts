import type { Pool } from "pg";

export type PublishableKeyRow = {
  id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  allowed_origins: string[];
  default_agent_id: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishableKeySummary = {
  id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  allowed_origins: string[];
  default_agent_id: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

const SUMMARY_COLUMNS = `id, workspace_id, name, key_prefix, allowed_origins, default_agent_id,
  revoked_at::text, created_at::text, updated_at::text`;

export class PublishableKeysRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    id: string;
    workspaceId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    allowedOrigins: string[];
    defaultAgentId?: string | null;
  }): Promise<PublishableKeySummary> {
    const result = await this.pool.query<PublishableKeySummary>(
      `INSERT INTO publishable_keys (
        id, workspace_id, name, key_prefix, key_hash, allowed_origins, default_agent_id
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING ${SUMMARY_COLUMNS}`,
      [
        input.id,
        input.workspaceId,
        input.name,
        input.keyPrefix,
        input.keyHash,
        JSON.stringify(input.allowedOrigins),
        input.defaultAgentId ?? null,
      ],
    );
    return result.rows[0]!;
  }

  async listByWorkspace(workspaceId: string): Promise<PublishableKeySummary[]> {
    const result = await this.pool.query<PublishableKeySummary>(
      `SELECT ${SUMMARY_COLUMNS} FROM publishable_keys
       WHERE workspace_id = $1
       ORDER BY created_at DESC`,
      [workspaceId],
    );
    return result.rows;
  }

  async getById(workspaceId: string, keyId: string): Promise<PublishableKeySummary | null> {
    const result = await this.pool.query<PublishableKeySummary>(
      `SELECT ${SUMMARY_COLUMNS} FROM publishable_keys
       WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, keyId],
    );
    return result.rows[0] ?? null;
  }

  async findByPrefix(prefix: string): Promise<PublishableKeyRow[]> {
    const result = await this.pool.query<PublishableKeyRow>(
      `SELECT id, workspace_id, name, key_prefix, key_hash, allowed_origins, default_agent_id,
        revoked_at::text, created_at::text, updated_at::text
       FROM publishable_keys
       WHERE key_prefix = $1 AND revoked_at IS NULL`,
      [prefix],
    );
    return result.rows.map((row) => ({
      ...row,
      allowed_origins: normalizeOrigins(row.allowed_origins),
    }));
  }

  async update(
    workspaceId: string,
    keyId: string,
    input: { name?: string; allowedOrigins?: string[]; defaultAgentId?: string | null },
  ): Promise<PublishableKeySummary | null> {
    const existing = await this.getById(workspaceId, keyId);
    if (!existing || existing.revoked_at) {
      return null;
    }
    const name = input.name?.trim() ?? existing.name;
    const allowedOrigins = input.allowedOrigins ?? existing.allowed_origins;
    const defaultAgentId =
      input.defaultAgentId !== undefined ? input.defaultAgentId : existing.default_agent_id;

    const result = await this.pool.query<PublishableKeySummary>(
      `UPDATE publishable_keys
       SET name = $3, allowed_origins = $4::jsonb, default_agent_id = $5, updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${SUMMARY_COLUMNS}`,
      [workspaceId, keyId, name, JSON.stringify(allowedOrigins), defaultAgentId],
    );
    return result.rows[0] ?? null;
  }

  async revoke(workspaceId: string, keyId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE publishable_keys SET revoked_at = NOW(), updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2 AND revoked_at IS NULL`,
      [workspaceId, keyId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function normalizeOrigins(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}
