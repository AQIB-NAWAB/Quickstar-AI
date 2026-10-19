import type { AuditEntry, AuditRepository, RepositoryResult } from "./types";

type GatewayAuditEntry = {
  id: string;
  workspace_id: string | null;
  actor_user_id: string;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  request_id: string;
  origin_ip?: string | null;
  country_code?: string | null;
  city?: string | null;
  user_agent?: string | null;
  changes?: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null } | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function mapEntry(raw: GatewayAuditEntry): AuditEntry {
  const isSystem = raw.actor_user_id === "system" || raw.target_type === "system";
  const name =
    raw.actor_name ||
    (raw.actor_email ? raw.actor_email.split("@")[0] : raw.actor_user_id.slice(0, 8));

  return {
    id: raw.id,
    workspaceId: raw.workspace_id ?? "",
    actor: {
      id: raw.actor_user_id,
      name,
      email: raw.actor_email ?? null,
      role: raw.actor_role ?? "member",
      type: isSystem ? "system" : "user",
    },
    action: raw.action,
    resource: {
      type: raw.target_type,
      id: raw.target_id,
      name: raw.target_id.length > 20 ? `${raw.target_id.slice(0, 16)}...` : raw.target_id,
    },
    occurredAt: raw.created_at,
    requestId: raw.request_id,
    originIp: raw.origin_ip ?? null,
    countryCode: raw.country_code ?? null,
    city: raw.city ?? null,
    userAgent: raw.user_agent ?? null,
    changes: raw.changes ?? null,
    metadata: raw.metadata ?? {},
    isRedacted: true,
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
    if (filters?.actions && filters.actions.length > 0 && filters.actions[0] !== "all") {
      params.set("action", filters.actions[0]);
    }
    if (filters?.actor && filters.actor !== "all") {
      params.set("actor", filters.actor);
    }
    if (filters?.q && filters.q.trim()) {
      params.set("q", filters.q.trim());
    }
    if (filters?.resource && filters.resource.trim()) {
      params.set("q", filters.resource.trim());
    }
    if (filters?.limit) {
      params.set("limit", String(filters.limit));
    }

    const qs = params.toString();
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/audit${qs ? `?${qs}` : ""}`,
        { signal, cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        entries?: GatewayAuditEntry[];
        next_cursor?: string | null;
        total?: number;
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
          total: body.total,
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Audit service unreachable" };
    }
  },

  async getEntry(workspaceId, entryId, signal) {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/audit/${encodeURIComponent(entryId)}`,
        { signal, cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        entry?: GatewayAuditEntry;
        error?: { message?: string };
      };
      if (!res.ok) {
        return fail(res.status, body.error?.message ?? res.statusText);
      }
      if (!body.entry) {
        return { status: "not_found", message: "Audit entry not found" };
      }
      return { status: "ready", data: mapEntry(body.entry) };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Audit service unreachable" };
    }
  },
};
