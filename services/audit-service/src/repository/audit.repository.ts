import type { Pool } from "pg";
import type { AuditEntryRow } from "../domain/types.js";

export type ListAuditOpts = {
  from: Date;
  to: Date;
  action?: string;
  limit: number;
  /** Opaque cursor = created_at ISO of last row */
  cursor?: string;
};

export class AuditRepository {
  constructor(private readonly pool: Pool) {}

  async listByWorkspace(
    workspaceId: string,
    opts: ListAuditOpts,
  ): Promise<AuditEntryRow[]> {
    const params: unknown[] = [workspaceId, opts.from, opts.to, opts.limit + 1];
    let actionClause = "";
    let cursorClause = "";
    if (opts.action) {
      params.push(opts.action);
      actionClause = ` AND action = $${params.length}`;
    }
    if (opts.cursor) {
      params.push(new Date(opts.cursor));
      cursorClause = ` AND created_at < $${params.length}`;
    }
    const result = await this.pool.query<AuditEntryRow>(
      `SELECT * FROM audit_entries
       WHERE workspace_id = $1
         AND created_at >= $2
         AND created_at < $3
         ${actionClause}
         ${cursorClause}
       ORDER BY created_at DESC
       LIMIT $4`,
      params,
    );
    return result.rows;
  }
}
