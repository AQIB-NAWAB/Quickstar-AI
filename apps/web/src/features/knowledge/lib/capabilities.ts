/**
 * Explicit capability declarations for Knowledge and Memory features based on the current backend implementation.
 *
 * Capabilities marked as false lack corresponding backend API contracts or ingestion infrastructure.
 * These are displayed with honest product-facing explanations rather than simulated or broken implementations.
 */
export const KNOWLEDGE_CAPABILITIES = {
  // Plain text sources are fully supported by POST /v1/workspaces/:workspaceId/knowledge/sources
  plainTextIngest: true,

  // URL fetching is not implemented in knowledge-service
  urlIngest: false,

  // Multipart or binary upload is not implemented; controller expects JSON payload
  fileUpload: false,

  // There is currently no public route to fetch individual chunks for a knowledge source
  chunkInspection: false,

  // List route returns a slice with a fixed limit; no server-side cursor/offset or true total
  serverPagination: false,

  // List route does not support query/search parameters
  serverSearch: false,

  // Single memory fact update (PATCH /v1/workspaces/:workspaceId/memory/facts/:factId)
  memoryFactEdit: true,

  // Single memory fact deletion (DELETE /v1/workspaces/:workspaceId/memory/facts/:factId)
  memoryFactDelete: true,

  // Subject-wide memory erasure (DELETE /v1/workspaces/:workspaceId/memory/facts?subject_key=...)
  memorySubjectErase: true,

  // Memory list is hard-capped at 20 facts per subject without pagination
  memoryFullPagination: false,
} as const;
