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
  source_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  char_count: number;
  indexed_version: number;
  raw_storage_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ListSourcesOptions = {
  search?: string;
  status?: string;
  type?: string;
  limit?: number;
  cursor?: string;
};

export type ListSourcesResult = {
  sources: KnowledgeSource[];
  total: number;
  total_workspace_count: number;
  status_counts: {
    ready: number;
    indexing: number;
    failed: number;
  };
  next_cursor: string | null;
};

const SELECT_COLUMNS = `id, workspace_id, name, kind, status, error_message, chunk_count, content_text,
  storage_key, content_type, version,
  COALESCE(source_url, NULL) AS source_url,
  COALESCE(file_name, NULL) AS file_name,
  file_size_bytes,
  COALESCE(char_count, 0) AS char_count,
  COALESCE(indexed_version, 0) AS indexed_version,
  raw_storage_key,
  created_at::text, updated_at::text`;

export class SourcesRepository {
  constructor(private readonly pool: Pool) {}

  async createSource(input: {
    workspaceId: string;
    name: string;
    kind: string;
    contentText: string | null;
    storageKey: string | null;
    contentType: string;
    sourceUrl?: string | null;
    fileName?: string | null;
    fileSizeBytes?: number | null;
    charCount?: number;
    rawStorageKey?: string | null;
  }): Promise<KnowledgeSource> {
    const id = randomUUID();
    const result = await this.pool.query<KnowledgeSource>(
      `INSERT INTO knowledge_sources (
         id, workspace_id, name, kind, status, content_text, storage_key,
         content_type, version, source_url, file_name, file_size_bytes,
         char_count, indexed_version, raw_storage_key
       )
       VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7, 1, $8, $9, $10, $11, 0, $12)
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.workspaceId,
        input.name,
        input.kind,
        input.contentText,
        input.storageKey,
        input.contentType,
        input.sourceUrl ?? null,
        input.fileName ?? null,
        input.fileSizeBytes ?? null,
        input.charCount ?? 0,
        input.rawStorageKey ?? null,
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

  async list(workspaceId: string, options: ListSourcesOptions = {}): Promise<ListSourcesResult> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

    // 1. Workspace totals & status breakdown
    const countsRes = await this.pool.query<{
      total: string;
      ready: string;
      indexing: string;
      failed: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'ready')::text AS ready,
         COUNT(*) FILTER (WHERE status IN ('queued', 'processing'))::text AS indexing,
         COUNT(*) FILTER (WHERE status = 'failed')::text AS failed
       FROM knowledge_sources
       WHERE workspace_id = $1`,
      [workspaceId],
    );
    const countRow = countsRes.rows[0] ?? { total: "0", ready: "0", indexing: "0", failed: "0" };
    const totalWorkspaceCount = Number(countRow.total || 0);
    const statusCounts = {
      ready: Number(countRow.ready || 0),
      indexing: Number(countRow.indexing || 0),
      failed: Number(countRow.failed || 0),
    };

    // 2. Build filtered query
    const conditions: string[] = ["workspace_id = $1"];
    const params: (string | number)[] = [workspaceId];
    let paramIdx = 2;

    if (options.status && options.status !== "all") {
      const s = options.status.toLowerCase();
      if (s === "indexing") {
        conditions.push(`status IN ('queued', 'processing')`);
      } else if (s === "ready" || s === "failed") {
        conditions.push(`status = $${paramIdx++}`);
        params.push(s);
      }
    }

    if (options.type && options.type !== "all") {
      const t = options.type.toLowerCase();
      if (t === "file") {
        conditions.push(`(kind = 'file' OR kind = 'document')`);
      } else if (t === "url") {
        conditions.push(`kind = 'url'`);
      } else if (t === "text") {
        conditions.push(`kind = 'text'`);
      }
    }

    if (options.search && options.search.trim()) {
      const searchPattern = `%${options.search.trim().toLowerCase()}%`;
      conditions.push(`(LOWER(name) LIKE $${paramIdx} OR LOWER(COALESCE(content_text, '')) LIKE $${paramIdx})`);
      params.push(searchPattern);
      paramIdx++;
    }

    // Filtered count
    const filterCountRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM knowledge_sources WHERE ${conditions.join(" AND ")}`,
      params,
    );
    const filteredTotal = Number(filterCountRes.rows[0]?.count || 0);

    // Keyset pagination using cursor: base64(updated_at,id)
    if (options.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(options.cursor, "base64url").toString("utf8")) as {
          updated_at: string;
          id: string;
        };
        if (decoded?.updated_at && decoded?.id) {
          conditions.push(
            `(updated_at < $${paramIdx} OR (updated_at = $${paramIdx} AND id < $${paramIdx + 1}))`,
          );
          params.push(decoded.updated_at, decoded.id);
          paramIdx += 2;
        }
      } catch {
        // Invalid cursor safely ignored
      }
    }

    // Add 1 to limit to check if next page exists
    const queryParams = [...params, limit + 1];
    const dataRes = await this.pool.query<KnowledgeSource>(
      `SELECT ${SELECT_COLUMNS}
       FROM knowledge_sources
       WHERE ${conditions.join(" AND ")}
       ORDER BY updated_at DESC, id DESC
       LIMIT $${paramIdx}`,
      queryParams,
    );

    const hasMore = dataRes.rows.length > limit;
    const rows = hasMore ? dataRes.rows.slice(0, limit) : dataRes.rows;

    let nextCursor: string | null = null;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ updated_at: lastRow.updated_at, id: lastRow.id }),
      ).toString("base64url");
    }

    return {
      sources: rows.map((row) => ({
        ...row,
        // Don't leak full raw text in list response
        content_text: null,
      })),
      total: filteredTotal,
      total_workspace_count: totalWorkspaceCount,
      status_counts: statusCounts,
      next_cursor: nextCursor,
    };
  }

  async countReady(workspaceId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM knowledge_sources
       WHERE workspace_id = $1 AND status = 'ready' AND chunk_count > 0`,
      [workspaceId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async updateName(workspaceId: string, sourceId: string, name: string): Promise<KnowledgeSource | null> {
    const result = await this.pool.query<KnowledgeSource>(
      `UPDATE knowledge_sources
       SET name = $3, updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [workspaceId, sourceId, name],
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(
    workspaceId: string,
    sourceId: string,
    status: SourceStatus,
    fields: {
      error_message?: string | null;
      chunk_count?: number;
      char_count?: number;
      indexed_version?: number;
    } = {},
    expectedVersion?: number,
  ): Promise<boolean> {
    const sets = [
      "status = $3",
      "error_message = $4",
      "updated_at = NOW()",
    ];
    const params: (string | number | null)[] = [
      workspaceId,
      sourceId,
      status,
      fields.error_message ?? null,
    ];
    let idx = 5;

    if (fields.chunk_count !== undefined) {
      sets.push(`chunk_count = $${idx++}`);
      params.push(fields.chunk_count);
    }
    if (fields.char_count !== undefined) {
      sets.push(`char_count = $${idx++}`);
      params.push(fields.char_count);
    }
    if (fields.indexed_version !== undefined) {
      sets.push(`indexed_version = $${idx++}`);
      params.push(fields.indexed_version);
    }

    let whereClause = `WHERE workspace_id = $1 AND id = $2`;
    if (expectedVersion !== undefined) {
      whereClause += ` AND version = $${idx++}`;
      params.push(expectedVersion);
    }

    const result = await this.pool.query(
      `UPDATE knowledge_sources SET ${sets.join(", ")} ${whereClause}`,
      params,
    );
    return (result.rowCount ?? 0) > 0;
  }

  async assignStorage(
    workspaceId: string,
    sourceId: string,
    storageKey: string,
    contentType: string,
    rawStorageKey?: string | null,
    charCount?: number,
  ): Promise<KnowledgeSource> {
    const result = await this.pool.query<KnowledgeSource>(
      `UPDATE knowledge_sources
       SET storage_key = $3,
           content_type = $4,
           raw_storage_key = COALESCE($5, raw_storage_key),
           char_count = COALESCE($6, char_count),
           content_text = NULL,
           updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [workspaceId, sourceId, storageKey, contentType, rawStorageKey ?? null, charCount ?? null],
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
      charCount?: number;
      sourceUrl?: string | null;
      fileName?: string | null;
      fileSizeBytes?: number | null;
      rawStorageKey?: string | null;
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
           char_count = COALESCE($8, char_count),
           source_url = COALESCE($9, source_url),
           file_name = COALESCE($10, file_name),
           file_size_bytes = COALESCE($11, file_size_bytes),
           raw_storage_key = COALESCE($12, raw_storage_key),
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
        fields.charCount ?? null,
        fields.sourceUrl ?? null,
        fields.fileName ?? null,
        fields.fileSizeBytes ?? null,
        fields.rawStorageKey ?? null,
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
