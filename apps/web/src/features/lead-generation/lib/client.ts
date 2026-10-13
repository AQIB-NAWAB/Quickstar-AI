import type {
  BusinessInput,
  LeadGenerationCandidateResult,
  LeadGenerationCursorPage,
  LeadGenerationDeliveryTask,
  LeadGenerationProfile,
  LeadGenerationRunCreateResponse,
  LeadGenerationRunSummary,
  LeadPolicy,
  LeadRunInput,
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

function base(workspaceId: string) {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/lead-generation`;
}

export async function getProfile(workspaceId: string, signal?: AbortSignal) {
  return bff<{ profile: LeadGenerationProfile | null }>(`${base(workspaceId)}/profile`, { signal });
}

export async function putProfile(
  workspaceId: string,
  body: { expected_version: number; business: BusinessInput },
) {
  return bff<{ profile: LeadGenerationProfile; research_scheduled?: boolean }>(
    `${base(workspaceId)}/profile`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export async function getPolicy(workspaceId: string, signal?: AbortSignal) {
  return bff<{ policy: LeadPolicy; version?: string }>(`${base(workspaceId)}/policy`, { signal });
}

export async function listRuns(workspaceId: string, signal?: AbortSignal) {
  return bff<LeadGenerationCursorPage<LeadGenerationRunSummary>>(`${base(workspaceId)}/runs`, {
    signal,
  });
}

export async function createRun(
  workspaceId: string,
  body: LeadRunInput,
  idempotencyKey: string,
) {
  return bff<LeadGenerationRunCreateResponse>(`${base(workspaceId)}/runs`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export async function getRun(workspaceId: string, runId: string, signal?: AbortSignal) {
  return bff<{ run: LeadGenerationRunSummary }>(
    `${base(workspaceId)}/runs/${encodeURIComponent(runId)}`,
    { signal },
  );
}

export async function getRunResults(workspaceId: string, runId: string, signal?: AbortSignal) {
  return bff<LeadGenerationCursorPage<LeadGenerationCandidateResult>>(
    `${base(workspaceId)}/runs/${encodeURIComponent(runId)}/results`,
    { signal },
  );
}

export async function getRunDeliveries(workspaceId: string, runId: string, signal?: AbortSignal) {
  return bff<{ items: LeadGenerationDeliveryTask[] }>(
    `${base(workspaceId)}/runs/${encodeURIComponent(runId)}/deliveries`,
    { signal },
  );
}

export async function cancelRun(workspaceId: string, runId: string) {
  return bff<{ run: LeadGenerationRunSummary }>(
    `${base(workspaceId)}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST", body: "{}" },
  );
}
