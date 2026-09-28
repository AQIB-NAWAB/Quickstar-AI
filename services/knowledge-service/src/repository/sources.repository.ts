import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type SourceStatus = "queued" | "processing" | "ready" | "failed";

export type KnowledgeSource = {
  id: string;
  workspace_id: string;
  name: string;
  kind: string;
  status: SourceStatus;
  error_message: string | null;
  chunk_count: number;
  content_text: string | null;
  storage_key: string | null;
  content_type: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNS = `id, workspace_id, name, kind, status, error_message, chunk_count, content_text,
  storage_key, content_type, version, created_at::text, updated_at::text`;

export class SourcesRepository {
  constructor(private readonly pool: Pool) {}

  async createSource(input: {
    workspaceId: string;
    name: string;
    kind: string;
    contentText: string | null;
    storageKey: string | null;
    contentType: string;
  }): Promise<KnowledgeSource> {
    const id = randomUUID();
    const result = await this.pool.query<KnowledgeSource>(
      `INSERT INTO knowledge_sources (id, workspace_id, name, kind, status, content_text, storage_key, content_type, version)
       VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7, 1)
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.workspaceId,
        input.name,
        input.kind,
        input.contentText,
        input.storageKey,
        input.contentType,
      ],
    );
    return result.rows[0];
  }

  async get(workspaceId: string, sourceId: string): Promise<KnowledgeSource | null> {
    const result = await this.pool.query<KnowledgeSource>(
      `SELECT ${SELECT_COLUMNS}
       FROM knowledge_sources WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, sourceId],
    );
    return result.rows[0] ?? null;
  }

  async list(workspaceId: string, limit = 20): Promise<KnowledgeSource[]> {
    const result = await this.pool.query<KnowledgeSource>(
      `SELECT ${SELECT_COLUMNS}
       FROM knowledge_sources WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [workspaceId, limit],
    );
    return result.rows.map((row) => ({
      ...row,
      content_text: null,
    }));
  }

  async countReady(workspaceId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM knowledge_sources
       WHERE workspace_id = $1 AND status = 'ready' AND chunk_count > 0`,
      [workspaceId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async updateStatus(
    workspaceId: string,
    sourceId: string,
    status: SourceStatus,
    fields: { error_message?: string | null; chunk_count?: number } = {},
  ): Promise<void> {
    await this.pool.query(
      `UPDATE knowledge_sources
       SET status = $3,
           error_message = COALESCE($4, error_message),
           chunk_count = COALESCE($5, chunk_count),
           updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2`,
      [
        workspaceId,
        sourceId,
        status,
        fields.error_message ?? null,
        fields.chunk_count ?? null,
      ],
    );
  }

  async assignStorage(
    workspaceId: string,
    sourceId: string,
    storageKey: string,
    contentType: string,
  ): Promise<KnowledgeSource> {
    const result = await this.pool.query<KnowledgeSource>(
      `UPDATE knowledge_sources
       SET storage_key = $3, content_type = $4, content_text = NULL, updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [workspaceId, sourceId, storageKey, contentType],
    );
    if (!result.rows[0]) {
      throw new Error("Source not found for storage assign");
    }
    return result.rows[0];
  }

  async updateForReingest(
    workspaceId: string,
    sourceId: string,
    fields: {
      name?: string;
      contentText: string | null;
      storageKey: string | null;
      contentType: string;
      version: number;
    },
  ): Promise<KnowledgeSource> {
    const result = await this.pool.query<KnowledgeSource>(
      `UPDATE knowledge_sources
       SET name = COALESCE($3, name),
           content_text = $4,
           storage_key = $5,
           content_type = $6,
           version = $7,
           status = 'queued',
           chunk_count = 0,
           error_message = NULL,
           updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [
        workspaceId,
        sourceId,
        fields.name ?? null,
        fields.contentText,
        fields.storageKey,
        fields.contentType,
        fields.version,
      ],
    );
    if (!result.rows[0]) {
      throw new Error("Source not found for reingest update");
    }
    return result.rows[0];
  }

  async delete(workspaceId: string, sourceId: string): Promise<KnowledgeSource | null> {
    const result = await this.pool.query<KnowledgeSource>(
      `DELETE FROM knowledge_sources WHERE workspace_id = $1 AND id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [workspaceId, sourceId],
    );
    return result.rows[0] ?? null;
  }
}
