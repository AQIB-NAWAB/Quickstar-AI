export type KnowledgeSourceStatus = "queued" | "processing" | "ready" | "failed";

export type KnowledgeSourcePresentationStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "unknown";

export type KnowledgeSourceType = "file" | "url" | "text" | "unknown";

export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  name: string;
  kind: string; // "text" | "document" | etc.
  status: KnowledgeSourceStatus;
  error_message: string | null;
  chunk_count: number;
  content_text: string | null;
  storage_key: string | null;
  content_type: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSourceInput {
  name: string;
  content: string;
  type?: string;
  content_type?: string;
}

export interface MemoryFact {
  id: string;
  workspace_id: string;
  subject_key: string;
  fact_key: string | null;
  fact_text: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  code?: string;
  message: string;
  request_id?: string;
}

export interface ChunkItem {
  id?: string;
  chunk_index: number;
  text: string;
  metadata?: Record<string, unknown>;
}
