import type { Pool } from "pg";
import type { IngestFactInput, UsageEntryRow } from "../domain/types.js";

export class UsageRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Insert append-only. Returns the row (existing or new).
   * `inserted` is true only when this call created the row.
   */
  async ingest(
    input: IngestFactInput,
  ): Promise<{ row: UsageEntryRow; inserted: boolean }> {
    const result = await this.pool.query<UsageEntryRow>(
      `INSERT INTO usage_entries (
         workspace_id, kind, units, unit_label, provider, model,
         price_micros, currency, idempotency_key, request_id, source_id, detail
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [
        input.workspaceId,
        input.kind,
        input.units,
        input.unitLabel ?? null,
        input.provider ?? null,
        input.model ?? null,
        input.priceMicros,
        input.currency,
        input.idempotencyKey,
        input.requestId,
        input.sourceId ?? null,
        JSON.stringify(input.detail ?? {}),
      ],
    );

    if (result.rows[0]) {
      return { row: result.rows[0], inserted: true };
    }

    const existing = await this.pool.query<UsageEntryRow>(
      `SELECT * FROM usage_entries WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    const row = existing.rows[0];
    if (!row) {
      throw new Error(`usage ingest conflict but row missing for ${input.idempotencyKey}`);
    }
    return { row, inserted: false };
  }

  async listByWorkspace(
    workspaceId: string,
    opts: { limit?: number; kind?: string } = {},
  ): Promise<UsageEntryRow[]> {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const params: unknown[] = [workspaceId, limit];
    let kindClause = "";
    if (opts.kind) {
      params.push(opts.kind);
      kindClause = ` AND kind = $3`;
    }
    const result = await this.pool.query<UsageEntryRow>(
      `SELECT * FROM usage_entries
       WHERE workspace_id = $1${kindClause}
       ORDER BY created_at DESC
       LIMIT $2`,
      params,
    );
    return result.rows;
  }

  async sumByWorkspace(
    workspaceId: string,
  ): Promise<{ count: number; sum_units: number; sum_price_micros: number }> {
    const result = await this.pool.query<{
      count: string;
      sum_units: string | null;
      sum_price_micros: string | null;
    }>(
      `SELECT
         COUNT(*)::text AS count,
         COALESCE(SUM(units), 0)::text AS sum_units,
         COALESCE(SUM(price_micros), 0)::text AS sum_price_micros
       FROM usage_entries
       WHERE workspace_id = $1`,
      [workspaceId],
    );
    const row = result.rows[0];
    return {
      count: Number(row?.count ?? 0),
      sum_units: Number(row?.sum_units ?? 0),
      sum_price_micros: Number(row?.sum_price_micros ?? 0),
    };
  }
}
