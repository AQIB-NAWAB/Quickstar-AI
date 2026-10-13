import type {
  LeadDetail,
  LeadStatus,
  LeadSummary,
  LeadsListResponse,
  RepositoryResult,
} from "./types";

type ApiError = { code?: string; message: string };

async function bff<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data?: T; error?: ApiError }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: ApiError;
    };
    if (!res.ok) {
      return {
        status: res.status,
        error:
          body.error ?? { code: `HTTP_${res.status}`, message: res.statusText || "Request failed" },
      };
    }
    return { status: res.status, data: body as unknown as T };
  } catch (err: unknown) {
    const isAbort =
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError") ||
      (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "AbortError");
    if (isAbort) {
      return {
        status: 0,
        error: { code: "ABORTED", message: "Request aborted" },
      };
    }
    return {
      status: 0,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network request failed",
      },
    };
  }
}

function failResult<T>(status: number, error?: ApiError): RepositoryResult<T> {
  if (error?.code === "ABORTED") return { status: "unavailable", message: "Request aborted" };
  if (status === 0) return { status: "unavailable", message: error?.message || "Service unavailable" };
  if (status === 403) return { status: "forbidden", message: error?.message || "Forbidden" };
  if (status === 404) return { status: "not_found", message: error?.message || "Not found" };
  return { status: "error", message: error?.message || "Request failed" };
}

function toResult<T>(status: number, data: T | undefined, error?: ApiError): RepositoryResult<T> {
  if (status === 0 || status === 403 || status === 404 || status >= 400 || data === undefined) {
    return failResult(status, error);
  }
  return { status: "ready", data };
}

function mapSummary(raw: Record<string, unknown>): LeadSummary {
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspace_id ?? raw.workspaceId),
    name: (raw.name as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    phone: (raw.phone as string | null) ?? null,
    intent: (raw.intent as string | null) ?? null,
    qualificationScore:
      raw.qualification_score === null || raw.qualification_score === undefined
        ? null
        : Number(raw.qualification_score ?? raw.qualificationScore),
    qualificationMax:
      raw.qualification_max === null || raw.qualification_max === undefined
        ? null
        : Number(raw.qualification_max ?? raw.qualificationMax),
    sentiment: (raw.sentiment as LeadSummary["sentiment"]) ?? "unknown",
    status: raw.status as LeadStatus,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    source: (raw.source as string | null) ?? null,
    capturedAt: (raw.captured_at as string | null) ?? null,
    version: typeof raw.version === "number" ? raw.version : 1,
  };
}

function mapDetail(
  raw: Record<string, unknown>,
  attributeLabels?: Record<string, string>,
): LeadDetail {
  return {
    ...mapSummary(raw),
    capturedFields:
      (raw.captured_fields as LeadDetail["capturedFields"]) ??
      (raw.capturedFields as LeadDetail["capturedFields"]) ??
      {},
    attributeLabels,
    originatingConversationId:
      (raw.originating_conversation_id as string | null) ??
      (raw.conversation_id as string | null) ??
      null,
    transcriptStatus:
      (raw.transcript_status as LeadDetail["transcriptStatus"]) ?? "unavailable",
    transcriptMessages: Array.isArray(raw.transcript_messages)
      ? (raw.transcript_messages as LeadDetail["transcriptMessages"])
      : [],
  };
}

export async function listLeadsApi(
  workspaceId: string,
  filters?: { q?: string; status?: string; tag?: string },
  signal?: AbortSignal,
): Promise<RepositoryResult<LeadsListResponse>> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.tag && filters.tag !== "all") params.set("tag", filters.tag);
  const qs = params.toString();
  const { status, data, error } = await bff<{
    leads: Record<string, unknown>[];
    available_tags?: string[];
    total?: number;
    attribute_labels?: Record<string, string>;
  }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/leads${qs ? `?${qs}` : ""}`, {
    signal,
  });
  if (error || !data) return failResult(status, error);
  return toResult(status, {
    leads: (data.leads ?? []).map(mapSummary),
    total: data.total,
    availableTags: data.available_tags ?? [],
    attributeLabels: data.attribute_labels,
  });
}

export async function getLeadApi(
  workspaceId: string,
  leadId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<LeadDetail>> {
  const { status, data, error } = await bff<{
    lead: Record<string, unknown>;
    attribute_labels?: Record<string, string>;
  }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/leads/${encodeURIComponent(leadId)}`,
    { signal },
  );
  if (error || !data?.lead) return failResult(status, error);
  return toResult(status, mapDetail(data.lead, data.attribute_labels));
}

export async function updateLeadStatusApi(
  workspaceId: string,
  leadId: string,
  nextStatus: LeadStatus,
  version?: number,
): Promise<RepositoryResult<LeadDetail>> {
  const { status, data, error } = await bff<{
    lead: Record<string, unknown>;
    attribute_labels?: Record<string, string>;
  }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/leads/${encodeURIComponent(leadId)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status: nextStatus, expected_version: version }),
    },
  );
  if (error || !data?.lead) return failResult(status, error);
  return toResult(status, mapDetail(data.lead, data.attribute_labels));
}
