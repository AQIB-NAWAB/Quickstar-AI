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
    actor_name: row.actor_name ?? null,
    actor_email: row.actor_email ?? null,
    actor_role: row.actor_role ?? null,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    request_id: row.request_id,
    origin_ip: row.origin_ip ?? null,
    country_code: row.country_code ?? null,
    city: row.city ?? null,
    user_agent: row.user_agent ?? null,
    changes: row.changes ?? null,
    metadata: row.metadata ?? {},
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/** Sanitize value against CSV Formula Injection (DDE attacks) and RFC-4180 escape */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = typeof val === "object" ? JSON.stringify(val) : String(val);

  // Formula injection defense: if first char is =, +, -, @, \t, or \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC-4180 quoting
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class AuditService {
  constructor(
    private readonly repo: AuditRepository,
    private readonly opts: { defaultListDays: number; maxListDays: number },
  ) {}

  private parseDateRange(query: { from?: string; to?: string }): { from: Date; to: Date } {
    const now = new Date();
    const maxMs = this.opts.maxListDays * 24 * 60 * 60 * 1000;
    const defaultMs = this.opts.defaultListDays * 24 * 60 * 60 * 1000;

    const to = query.to ? new Date(query.to) : now;
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - defaultMs);

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
    return { from, to };
  }

  async list(
    workspaceId: string,
    query: {
      from?: string;
      to?: string;
      action?: string;
      actor?: string;
      q?: string;
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

    const { from, to } = this.parseDateRange(query);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const { rows, total } = await this.repo.listByWorkspace(workspaceId, {
      from,
      to,
      action: query.action,
      actor: query.actor,
      q: query.q,
      limit,
      cursor: query.cursor,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      entries: page.map(toEntry),
      next_cursor: hasMore && last ? toEntry(last).created_at : null,
      total,
    };
  }

  async getById(workspaceId: string, entryId: string): Promise<AuditEntry> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const row = await this.repo.findById(workspaceId, entryId);
    if (!row) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: `Audit entry with id ${entryId} not found`,
      });
    }

    return toEntry(row);
  }

  async exportCsv(
    workspaceId: string,
    query: {
      from?: string;
      to?: string;
      action?: string;
      actor?: string;
      q?: string;
      limit?: number;
    },
  ): Promise<string> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }

    const { from, to } = this.parseDateRange(query);
    const rows = await this.repo.exportByWorkspace(workspaceId, {
      from,
      to,
      action: query.action,
      actor: query.actor,
      q: query.q,
      limit: Math.min(Math.max(query.limit ?? 5000, 1), 10000),
    });

    const headers = [
      "id",
      "timestamp_utc",
      "actor_user_id",
      "actor_name",
      "actor_email",
      "actor_role",
      "action",
      "target_type",
      "target_id",
      "request_id",
      "origin_ip",
      "country_code",
      "city",
      "user_agent",
      "changes",
      "metadata",
    ];

    const lines: string[] = [headers.join(",")];

    for (const r of rows) {
      const line = [
        escapeCsvCell(r.id),
        escapeCsvCell(r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at),
        escapeCsvCell(r.actor_user_id),
        escapeCsvCell(r.actor_name),
        escapeCsvCell(r.actor_email),
        escapeCsvCell(r.actor_role),
        escapeCsvCell(r.action),
        escapeCsvCell(r.target_type),
        escapeCsvCell(r.target_id),
        escapeCsvCell(r.request_id),
        escapeCsvCell(r.origin_ip),
        escapeCsvCell(r.country_code),
        escapeCsvCell(r.city),
        escapeCsvCell(r.user_agent),
        escapeCsvCell(r.changes),
        escapeCsvCell(r.metadata),
      ].join(",");
      lines.push(line);
    }

    // Return with UTF-8 BOM
    return `\uFEFF${lines.join("\r\n")}`;
  }
}
