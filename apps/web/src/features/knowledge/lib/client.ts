import type {
  ApiError,
  ChunkItem,
  CreateFactInput,
  CreateSourceInput,
  KnowledgeSource,
  ListChunksResponse,
  ListSourcesQuery,
  ListSourcesResponse,
  MemoryFact,
  UpdateFactInput,
  UpdateSourceInput,
} from "./types";

type BffResponse<T> = { data?: T; error?: ApiError; status: number };

async function bff<T>(path: string, init?: RequestInit): Promise<BffResponse<T>> {
  try {
    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
    };

    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(path, {
      ...init,
      headers,
      cache: "no-store",
    });

    const body = (await res.json().catch(() => ({}))) as {
      source?: KnowledgeSource;
      sources?: KnowledgeSource[];
      chunks?: ChunkItem[];
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
  queryOptions: ListSourcesQuery = {},
  signal?: AbortSignal,
): Promise<{
  sources?: KnowledgeSource[];
  total?: number;
  total_workspace_count?: number;
  status_counts?: { ready: number; indexing: number; failed: number };
  next_cursor?: string | null;
  error?: ApiError;
}> {
  const params = new URLSearchParams();
  if (queryOptions.limit) params.set("limit", String(queryOptions.limit));
  if (queryOptions.search?.trim()) params.set("search", queryOptions.search.trim());
  if (queryOptions.status && queryOptions.status !== "all") params.set("status", queryOptions.status);
  if (queryOptions.type && queryOptions.type !== "all") params.set("type", queryOptions.type);
  if (queryOptions.cursor) params.set("cursor", queryOptions.cursor);

  const qs = params.toString();
  const { data, error } = await bff<ListSourcesResponse>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources${qs ? `?${qs}` : ""}`,
    { signal },
  );

  if (error) return { error };

  return {
    sources: data?.sources ?? [],
    total: data?.total ?? 0,
    total_workspace_count: data?.total_workspace_count ?? 0,
    status_counts: data?.status_counts ?? { ready: 0, indexing: 0, failed: 0 },
    next_cursor: data?.next_cursor ?? null,
  };
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

export async function uploadSource(
  workspaceId: string,
  fileOrFormData: File | FormData,
  name?: string,
): Promise<{ source?: KnowledgeSource; error?: ApiError }> {
  let body: FormData;
  if (fileOrFormData instanceof FormData) {
    body = fileOrFormData;
  } else {
    body = new FormData();
    body.append("file", fileOrFormData);
    if (name) body.append("name", name);
  }
  const { data, error } = await bff<{ source: KnowledgeSource }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/upload`,
    {
      method: "POST",
      body,
    },
  );
  if (error) return { error };
  return { source: data?.source };
}

export async function updateSource(
  workspaceId: string,
  sourceId: string,
  input: UpdateSourceInput,
): Promise<{ source?: KnowledgeSource; error?: ApiError }> {
  const { data, error } = await bff<{ source: KnowledgeSource }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/${encodeURIComponent(sourceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { source: data?.source };
}

export async function listSourceChunks(
  workspaceId: string,
  sourceId: string,
  limit: number = 20,
  cursor?: string,
  signal?: AbortSignal,
): Promise<{
  chunks?: ChunkItem[];
  chunk_count?: number;
  source_version?: number;
  next_cursor?: string | null;
  error?: ApiError;
}> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const { data, error } = await bff<ListChunksResponse>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/${encodeURIComponent(sourceId)}/chunks?${params.toString()}`,
    { signal },
  );

  if (error) return { error };

  return {
    chunks: data?.chunks ?? [],
    chunk_count: data?.chunk_count ?? 0,
    source_version: data?.source_version ?? 1,
    next_cursor: data?.next_cursor ?? null,
  };
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

// ----------------------------------------------------------------------
// Memory Facts SDK functions (Preserved)
// ----------------------------------------------------------------------

export async function listFacts(
  workspaceId: string,
  subjectKey: string,
  limit = 50,
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

export async function createFact(
  workspaceId: string,
  input: CreateFactInput,
): Promise<{ fact?: MemoryFact; error?: ApiError }> {
  const { data, error } = await bff<{ fact: MemoryFact }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/memory/facts`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { fact: data?.fact };
}

export async function updateFact(
  workspaceId: string,
  factId: string,
  input: UpdateFactInput,
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
