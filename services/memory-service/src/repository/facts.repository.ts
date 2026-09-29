import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type MemoryFactRow = {
  id: string;
  workspace_id: string;
  subject_key: string;
  fact_key: string | null;
  fact_text: string;
  created_by_actor_id: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNS = `id, workspace_id, subject_key, fact_key, fact_text, created_by_actor_id,
  created_at::text, updated_at::text`;

export class FactsRepository {
  constructor(private readonly pool: Pool) {}

  async countForSubject(workspaceId: string, subjectKey: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM memory_facts
       WHERE workspace_id = $1 AND subject_key = $2`,
      [workspaceId, subjectKey],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async list(
    workspaceId: string,
    subjectKey: string,
    limit: number,
  ): Promise<MemoryFactRow[]> {
    const result = await this.pool.query<MemoryFactRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM memory_facts
       WHERE workspace_id = $1 AND subject_key = $2
       ORDER BY updated_at DESC
       LIMIT $3`,
      [workspaceId, subjectKey, limit],
    );
    return result.rows;
  }

  async get(workspaceId: string, factId: string): Promise<MemoryFactRow | null> {
    const result = await this.pool.query<MemoryFactRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM memory_facts WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, factId],
    );
    return result.rows[0] ?? null;
  }

  async insert(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string | null;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    const id = randomUUID();
    const result = await this.pool.query<MemoryFactRow>(
      `INSERT INTO memory_facts (id, workspace_id, subject_key, fact_key, fact_text, created_by_actor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.workspaceId,
        input.subjectKey,
        input.factKey,
        input.factText,
        input.createdByActorId,
      ],
    );
    return result.rows[0];
  }

  async upsertByFactKey(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    const id = randomUUID();
    const result = await this.pool.query<MemoryFactRow>(
      `INSERT INTO memory_facts (id, workspace_id, subject_key, fact_key, fact_text, created_by_actor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (workspace_id, subject_key, fact_key) WHERE fact_key IS NOT NULL
       DO UPDATE SET fact_text = EXCLUDED.fact_text,
                     created_by_actor_id = COALESCE(EXCLUDED.created_by_actor_id, memory_facts.created_by_actor_id),
                     updated_at = NOW()
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.workspaceId,
        input.subjectKey,
        input.factKey,
        input.factText,
        input.createdByActorId,
      ],
    );
    return result.rows[0];
  }

  async update(
    workspaceId: string,
    factId: string,
    fields: { factText?: string; factKey?: string | null },
  ): Promise<MemoryFactRow | null> {
    const result = await this.pool.query<MemoryFactRow>(
      `UPDATE memory_facts
       SET fact_text = COALESCE($3, fact_text),
           fact_key = COALESCE($4, fact_key),
           updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [workspaceId, factId, fields.factText ?? null, fields.factKey ?? null],
    );
    return result.rows[0] ?? null;
  }

  async deleteOne(workspaceId: string, factId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM memory_facts WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, factId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteBySubject(workspaceId: string, subjectKey: string): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM memory_facts WHERE workspace_id = $1 AND subject_key = $2`,
      [workspaceId, subjectKey],
    );
    return result.rowCount ?? 0;
  }
}
