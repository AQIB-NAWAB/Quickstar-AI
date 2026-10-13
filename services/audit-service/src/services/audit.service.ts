import { AppError, ErrorCode } from "@quickstart/errors";
import type { AuditEntry, AuditListResponse } from "@quickstart/contracts";
import type { AuditEntryRow } from "../domain/types.js";
import type { AuditRepository } from "../repository/audit.repository.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toEntry(row: AuditEntryRow): AuditEntry {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    org_id: row.org_id,
    actor_user_id: row.actor_user_id,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    request_id: row.request_id,
    metadata: row.metadata ?? {},
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export class AuditService {
  constructor(
    private readonly repo: AuditRepository,
    private readonly opts: { defaultListDays: number; maxListDays: number },
  ) {}

  async list(
    workspaceId: string,
    query: {
      from?: string;
      to?: string;
      action?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<AuditListResponse> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const now = new Date();
    const maxMs = this.opts.maxListDays * 24 * 60 * 60 * 1000;
    const defaultMs = this.opts.defaultListDays * 24 * 60 * 60 * 1000;

    let to = query.to ? new Date(query.to) : now;
    let from = query.from ? new Date(query.from) : new Date(to.getTime() - defaultMs);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "from/to must be valid ISO timestamps",
      });
    }
    if (from >= to) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "from must be before to",
      });
    }
    if (to.getTime() - from.getTime() > maxMs) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Time range cannot exceed ${this.opts.maxListDays} days`,
      });
    }

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const rows = await this.repo.listByWorkspace(workspaceId, {
      from,
      to,
      action: query.action,
      limit,
      cursor: query.cursor,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      entries: page.map(toEntry),
      next_cursor: hasMore && last ? toEntry(last).created_at : null,
    };
  }
}
