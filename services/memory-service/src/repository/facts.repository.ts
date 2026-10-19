import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { AppError, ErrorCode } from "@quickstart/errors";
import { MAX_FACTS_PER_SUBJECT } from "../lib/limits.js";

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
       ORDER BY updated_at DESC, id ASC
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

  async createAtomic(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string | null;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Serialize concurrent mutations on this specific (workspace_id, subject_key) tuple
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        [input.workspaceId, input.subjectKey],
      );

      // If a non-null fact_key is provided, check if an existing fact already has this key
      if (input.factKey !== null) {
        const existing = await client.query<MemoryFactRow>(
          `SELECT ${SELECT_COLUMNS} FROM memory_facts
           WHERE workspace_id = $1 AND subject_key = $2 AND fact_key = $3`,
          [input.workspaceId, input.subjectKey, input.factKey],
        );

        if (existing.rows.length > 0) {
          // Keyed upsert: update existing fact in place (allowed even at capacity since count doesn't increase)
          const updated = await client.query<MemoryFactRow>(
            `UPDATE memory_facts
             SET fact_text = $4,
                 created_by_actor_id = COALESCE($5, created_by_actor_id),
                 updated_at = NOW()
             WHERE workspace_id = $1 AND subject_key = $2 AND fact_key = $3
             RETURNING ${SELECT_COLUMNS}`,
            [
              input.workspaceId,
              input.subjectKey,
              input.factKey,
              input.factText,
              input.createdByActorId,
            ],
          );
          await client.query("COMMIT");
          return updated.rows[0];
        }
      }

      // If inserting a new fact (keyed or unkeyed), enforce the 50-fact subject limit atomically
      const countRes = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM memory_facts
         WHERE workspace_id = $1 AND subject_key = $2`,
        [input.workspaceId, input.subjectKey],
      );
      const currentCount = Number(countRes.rows[0]?.count ?? 0);

      if (currentCount >= MAX_FACTS_PER_SUBJECT) {
        await client.query("ROLLBACK");
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Maximum ${MAX_FACTS_PER_SUBJECT} facts per subject reached. Cannot add new fact.`,
        });
      }

      const id = randomUUID();
      const inserted = await client.query<MemoryFactRow>(
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

      await client.query("COMMIT");
      return inserted.rows[0];
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      if ((err as { code?: string }).code === "23505") {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "A fact with this key already exists for this subject",
        });
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async insert(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string | null;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    return this.createAtomic(input);
  }

  async upsertByFactKey(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    return this.createAtomic(input);
  }

  async update(
    workspaceId: string,
    factId: string,
    fields: { factText?: string; factKey?: string | null },
  ): Promise<MemoryFactRow | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [workspaceId, factId];

    if (fields.factText !== undefined) {
      params.push(fields.factText);
      setClauses.push(`fact_text = $${params.length}`);
    }

    if (fields.factKey !== undefined) {
      // Handles explicit null to clear fact_key, or a string value
      params.push(fields.factKey);
      setClauses.push(`fact_key = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return this.get(workspaceId, factId);
    }

    setClauses.push("updated_at = NOW()");

    try {
      const result = await this.pool.query<MemoryFactRow>(
        `UPDATE memory_facts
         SET ${setClauses.join(", ")}
         WHERE workspace_id = $1 AND id = $2
         RETURNING ${SELECT_COLUMNS}`,
        params,
      );
      return result.rows[0] ?? null;
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "A fact with this key already exists for this subject",
        });
      }
      throw err;
    }
  }

  async deleteOne(workspaceId: string, factId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM memory_facts WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, factId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteBySubject(workspaceId: string, subjectKey: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        [workspaceId, subjectKey],
      );
      const result = await client.query(
        `DELETE FROM memory_facts WHERE workspace_id = $1 AND subject_key = $2`,
        [workspaceId, subjectKey],
      );
      await client.query("COMMIT");
      return result.rowCount ?? 0;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}
