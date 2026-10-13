import type {
  AuditEntry,
  AuditFilters,
  AuditRepository,
  RepositoryResult,
} from "./types";

type GatewayAuditEntry = {
  id: string;
  workspace_id: string | null;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  request_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function mapEntry(raw: GatewayAuditEntry): AuditEntry {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id ?? "",
    actor: {
      id: raw.actor_user_id,
      name: raw.actor_user_id.slice(0, 8),
      type: "user",
    },
    action: raw.action,
    resource: {
      type: raw.target_type,
      id: raw.target_id,
      name: raw.target_id.slice(0, 8),
    },
    occurredAt: raw.created_at,
    requestId: raw.request_id,
    metadata: raw.metadata ?? {},
    changes: null,
  };
}

function fail<T>(status: number, message: string): RepositoryResult<T> {
  if (status === 0) return { status: "unavailable", message };
  if (status === 403) return { status: "forbidden", message };
  if (status === 404) return { status: "not_found", message };
  return { status: "error", message };
}

export const apiAuditRepository: AuditRepository = {
  async listEntries(workspaceId, filters, signal) {
    const params = new URLSearchParams();
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.fromDate) params.set("from", filters.fromDate);
    if (filters?.toDate) params.set("to", filters.toDate);
    const qs = params.toString();
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/audit${qs ? `?${qs}` : ""}`,
        { signal, cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        entries?: GatewayAuditEntry[];
        next_cursor?: string | null;
        error?: { message?: string };
      };
      if (!res.ok) {
        return fail(res.status, body.error?.message ?? res.statusText);
      }
      return {
        status: "ready",
        data: {
          entries: (body.entries ?? []).map(mapEntry),
          nextCursor: body.next_cursor ?? undefined,
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Audit service unreachable" };
    }
  },

  async getEntry(workspaceId, entryId, signal) {
    const listed = await this.listEntries(workspaceId, undefined, signal);
    if (listed.status !== "ready") return listed;
    const entry = listed.data.entries.find((e) => e.id === entryId);
    if (!entry) return { status: "not_found", message: "Audit entry not found" };
    return { status: "ready", data: entry };
  },
};
