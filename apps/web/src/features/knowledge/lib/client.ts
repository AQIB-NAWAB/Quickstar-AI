import type {
  ApiError,
  CreateSourceInput,
  KnowledgeSource,
  MemoryFact,
} from "./types";

type BffResponse<T> = { data?: T; error?: ApiError; status: number };

async function bff<T>(path: string, init?: RequestInit): Promise<BffResponse<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    const body = (await res.json().catch(() => ({}))) as {
      source?: KnowledgeSource;
      sources?: KnowledgeSource[];
      fact?: MemoryFact;
      facts?: MemoryFact[];
      deleted?: boolean;
      deleted_count?: number;
      total?: number;
      error?: ApiError;
      [key: string]: unknown;
    };

    if (!res.ok) {
      return {
        status: res.status,
        error: body?.error ?? {
          code: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
        },
      };
    }

    return { status: res.status, data: body as unknown as T };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
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

export async function listSources(
  workspaceId: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<{ sources?: KnowledgeSource[]; total?: number; error?: ApiError }> {
  const query = new URLSearchParams({ limit: String(limit) }).toString();
  const { data, error } = await bff<{ sources: KnowledgeSource[]; total: number }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources?${query}`,
    { signal },
  );
  if (error) return { error };
  return { sources: data?.sources ?? [], total: data?.total ?? 0 };
}

export async function getSource(
  workspaceId: string,
  sourceId: string,
  signal?: AbortSignal,
): Promise<{ source?: KnowledgeSource; error?: ApiError; status?: number }> {
  const { data, error, status } = await bff<{ source: KnowledgeSource }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/${encodeURIComponent(sourceId)}`,
    { signal },
  );
  if (error) return { error, status };
  return { source: data?.source, status };
}

export async function createSource(
  workspaceId: string,
  input: CreateSourceInput,
): Promise<{ source?: KnowledgeSource; error?: ApiError }> {
  const { data, error } = await bff<{ source: KnowledgeSource }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { source: data?.source };
}

export async function deleteSource(
  workspaceId: string,
  sourceId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { data, error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/${encodeURIComponent(sourceId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: Boolean(data?.deleted) };
}

export async function listFacts(
  workspaceId: string,
  subjectKey: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<{ facts?: MemoryFact[]; total?: number; error?: ApiError }> {
  const query = new URLSearchParams({
    subject_key: subjectKey,
    limit: String(limit),
  }).toString();

  const { data, error } = await bff<{ facts: MemoryFact[]; total: number }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/memory/facts?${query}`,
    { signal },
  );
  if (error) return { error };
  return { facts: data?.facts ?? [], total: data?.total ?? 0 };
}

export async function updateFact(
  workspaceId: string,
  factId: string,
  input: { fact_text: string },
): Promise<{ fact?: MemoryFact; error?: ApiError }> {
  const { data, error } = await bff<{ fact: MemoryFact }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/memory/facts/${encodeURIComponent(factId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { fact: data?.fact };
}

export async function deleteFact(
  workspaceId: string,
  factId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { data, error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/memory/facts/${encodeURIComponent(factId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: Boolean(data?.deleted) };
}

export async function eraseSubjectMemory(
  workspaceId: string,
  subjectKey: string,
): Promise<{ success: boolean; deletedCount?: number; error?: ApiError }> {
  const query = new URLSearchParams({ subject_key: subjectKey }).toString();
  const { data, error } = await bff<{ deleted_count?: number }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/memory/facts?${query}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: true, deletedCount: data?.deleted_count };
}
