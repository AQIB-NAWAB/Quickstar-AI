export type KnowledgeSourceStatus = "queued" | "processing" | "ready" | "failed";

export type KnowledgeSourcePresentationStatus =
  | "ready"
  | "indexing"
  | "failed"
  | "unknown";

export interface SourceStatusCounts {
  all?: number;
  ready?: number;
  indexing?: number;
  failed?: number;
  [key: string]: number | undefined;
}

export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  name: string;
  kind: string; // "text" | "file" | "url" | "document"
  status: KnowledgeSourceStatus;
  error_message: string | null;
  chunk_count: number;
  content_text: string | null;
  storage_key: string | null;
  content_type: string | null;
  version: number;
  source_url?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  char_count?: number;
  indexed_version?: number;
  raw_storage_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTextSourceInput {
  name: string;
  content: string;
  type?: "text" | "document";
  content_type?: string;
}

export interface CreateUrlSourceInput {
  name?: string;
  url: string;
  type: "url";
}

export type CreateSourceInput = CreateTextSourceInput | CreateUrlSourceInput;

export interface UpdateSourceInput {
  name?: string;
  content?: string;
  content_type?: string;
}

export interface MemoryFact {
  id: string;
  workspace_id: string;
  subject_key: string;
  fact_key: string | null;
  fact_text: string;
  created_by_actor_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFactInput {
  subject_key: string;
  fact_key?: string | null;
  fact_text: string;
}

export interface UpdateFactInput {
  fact_text?: string;
  fact_key?: string | null;
}

export interface ApiError {
  code?: string;
  message: string;
  request_id?: string;
}

export interface ChunkItem {
  id: string;
  chunk_index: number;
  text: string;
  start_char: number | null;
  end_char: number | null;
}

export interface ListSourcesQuery {
  search?: string;
  status?: string;
  type?: string;
  limit?: number;
  cursor?: string;
}

export interface ListSourcesResponse {
  sources: KnowledgeSource[];
  total: number;
  total_workspace_count: number;
  status_counts: {
    ready: number;
    indexing: number;
    failed: number;
  };
  next_cursor: string | null;
}

export interface ListChunksResponse {
  request_id?: string;
  source_id: string;
  source_version: number;
  chunk_count: number;
  chunks: ChunkItem[];
  next_cursor: string | null;
}
