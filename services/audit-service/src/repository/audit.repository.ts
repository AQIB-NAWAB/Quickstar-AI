import type { Pool } from "pg";
import type { AuditEntryRow } from "../domain/types.js";

export type ListAuditOpts = {
  from: Date;
  to: Date;
  action?: string;
  actor?: string;
  q?: string;
  limit: number;
  /** Opaque cursor = created_at ISO of last row */
  cursor?: string;
};

export class AuditRepository {
  constructor(private readonly pool: Pool) {}

  async listByWorkspace(
    workspaceId: string,
    opts: ListAuditOpts,
  ): Promise<{ rows: AuditEntryRow[]; total: number }> {
    const params: unknown[] = [workspaceId, opts.from, opts.to];
    let extraFilters = "";

    if (opts.action && opts.action !== "all") {
      params.push(opts.action);
      extraFilters += ` AND action = $${params.length}`;
    }

    if (opts.actor && opts.actor !== "all") {
      params.push(`%${opts.actor}%`);
      extraFilters += ` AND (actor_user_id::text ILIKE $${params.length} OR COALESCE(actor_name, '') ILIKE $${params.length} OR COALESCE(actor_email, '') ILIKE $${params.length})`;
    }

    if (opts.q && opts.q.trim()) {
      params.push(`%${opts.q.trim()}%`);
      extraFilters += ` AND (
        target_id ILIKE $${params.length}
        OR request_id ILIKE $${params.length}
        OR action ILIKE $${params.length}
        OR COALESCE(actor_name, '') ILIKE $${params.length}
        OR COALESCE(actor_email, '') ILIKE $${params.length}
      )`;
    }

    // Total count query
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM audit_entries
       WHERE workspace_id = $1
         AND created_at >= $2
         AND created_at < $3
         ${extraFilters}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    let cursorClause = "";
    if (opts.cursor) {
      params.push(new Date(opts.cursor));
      cursorClause = ` AND created_at < $${params.length}`;
    }

    params.push(opts.limit + 1);
    const limitParamIndex = params.length;

    const result = await this.pool.query<AuditEntryRow>(
      `SELECT * FROM audit_entries
       WHERE workspace_id = $1
         AND created_at >= $2
         AND created_at < $3
         ${extraFilters}
         ${cursorClause}
       ORDER BY created_at DESC
       LIMIT $${limitParamIndex}`,
      params,
    );

    return { rows: result.rows, total };
  }

  async findById(workspaceId: string, entryId: string): Promise<AuditEntryRow | null> {
    const result = await this.pool.query<AuditEntryRow>(
      `SELECT * FROM audit_entries
       WHERE workspace_id = $1 AND id = $2
       LIMIT 1`,
      [workspaceId, entryId],
    );
    return result.rows[0] ?? null;
  }

  async exportByWorkspace(
    workspaceId: string,
    opts: Omit<ListAuditOpts, "cursor"> & { limit?: number },
  ): Promise<AuditEntryRow[]> {
    const params: unknown[] = [workspaceId, opts.from, opts.to];
    let extraFilters = "";

    if (opts.action && opts.action !== "all") {
      params.push(opts.action);
      extraFilters += ` AND action = $${params.length}`;
    }

    if (opts.actor && opts.actor !== "all") {
      params.push(`%${opts.actor}%`);
      extraFilters += ` AND (actor_user_id::text ILIKE $${params.length} OR COALESCE(actor_name, '') ILIKE $${params.length} OR COALESCE(actor_email, '') ILIKE $${params.length})`;
    }

    if (opts.q && opts.q.trim()) {
      params.push(`%${opts.q.trim()}%`);
      extraFilters += ` AND (
        target_id ILIKE $${params.length}
        OR request_id ILIKE $${params.length}
        OR action ILIKE $${params.length}
        OR COALESCE(actor_name, '') ILIKE $${params.length}
        OR COALESCE(actor_email, '') ILIKE $${params.length}
      )`;
    }

    params.push(opts.limit ?? 5000);
    const limitIndex = params.length;

    const result = await this.pool.query<AuditEntryRow>(
      `SELECT * FROM audit_entries
       WHERE workspace_id = $1
         AND created_at >= $2
         AND created_at < $3
         ${extraFilters}
       ORDER BY created_at DESC
       LIMIT $${limitIndex}`,
      params,
    );

    return result.rows;
  }
}
