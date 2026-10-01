import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type SecretRow = {
  id: string;
  workspace_id: string;
  name: string;
  ciphertext: string;
  key_version: number;
  created_at: string;
  updated_at: string;
};

/** Projected row used for list responses — ciphertext never included */
export type SecretSummaryRow = {
  id: string;
  workspace_id: string;
  name: string;
  key_version: number;
  created_at: string;
  updated_at: string;
};

const FULL_COLUMNS = `id, workspace_id, name, ciphertext, key_version,
  created_at::text, updated_at::text`;

const SUMMARY_COLUMNS = `id, workspace_id, name, key_version,
  created_at::text, updated_at::text`;

export class SecretsRepository {
  constructor(private readonly pool: Pool) {}

  async listNames(workspaceId: string): Promise<SecretSummaryRow[]> {
    const result = await this.pool.query<SecretSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS} FROM secrets
       WHERE workspace_id = $1
       ORDER BY name ASC`,
      [workspaceId],
    );
    return result.rows;
  }

  /** Full row including ciphertext — only for internal decrypt path */
  async getByName(workspaceId: string, name: string): Promise<SecretRow | null> {
    const result = await this.pool.query<SecretRow>(
      `SELECT ${FULL_COLUMNS} FROM secrets
       WHERE workspace_id = $1 AND name = $2`,
      [workspaceId, name],
    );
    return result.rows[0] ?? null;
  }

  /** Upsert: insert or overwrite ciphertext for an existing name */
  async upsert(input: {
    workspaceId: string;
    name: string;
    ciphertext: string;
    keyVersion: number;
  }): Promise<SecretSummaryRow> {
    const id = randomUUID();
    const result = await this.pool.query<SecretSummaryRow>(
      `INSERT INTO secrets (id, workspace_id, name, ciphertext, key_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (workspace_id, name)
       DO UPDATE SET ciphertext  = EXCLUDED.ciphertext,
                     key_version = EXCLUDED.key_version,
                     updated_at  = NOW()
       RETURNING ${SUMMARY_COLUMNS}`,
      [id, input.workspaceId, input.name, input.ciphertext, input.keyVersion],
    );
    return result.rows[0]!;
  }

  /** Rotate: update ciphertext and bump key_version for an existing row */
  async rotate(input: {
    workspaceId: string;
    name: string;
    newCiphertext: string;
    newKeyVersion: number;
  }): Promise<SecretSummaryRow | null> {
    const result = await this.pool.query<SecretSummaryRow>(
      `UPDATE secrets
       SET ciphertext  = $3,
           key_version = $4,
           updated_at  = NOW()
       WHERE workspace_id = $1 AND name = $2
       RETURNING ${SUMMARY_COLUMNS}`,
      [input.workspaceId, input.name, input.newCiphertext, input.newKeyVersion],
    );
    return result.rows[0] ?? null;
  }

  async deleteByName(workspaceId: string, name: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM secrets WHERE workspace_id = $1 AND name = $2`,
      [workspaceId, name],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
