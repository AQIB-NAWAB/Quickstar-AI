/** Shared API types and constants (expanded as services land). */
export const CONTRACTS_VERSION = "0.0.0";

export type HealthResponse = {
  status: "ok";
  service: string;
};

export {
  WORKSPACE_ROLES,
  WORKSPACE_PERMISSIONS,
  permissionsForRole,
  roleHasPermission,
  type WorkspacePermission,
  type WorkspaceRole,
} from "./workspace-permissions.js";

export type {
  ChatMessage,
  ChatMessageRole,
  CompletionRequestBody,
  CompletionResponseBody,
  DecideRequestBody,
  DecideResponseBody,
  JevQuestion,
  JevQuestionType,
  ModelCredentialSource,
  ModelReference,
  ModelRoutingMode,
  TokenUsage,
} from "./model-gateway.js";

export type {
  AcquisitionAction,
  AcquisitionJobStatus,
  AcquisitionUsage,
  CrawlRequestBody,
  CrawlResponseBody,
  FetchAction,
  FetchJobStatus,
  FetchUsage,
  JobGetResponseBody,
  ScrapeRequestBody,
  ScrapeResponseBody,
  SearchRequestBody,
  SearchResponseBody,
  SearchResultItem,
} from "./web-fetch.js";
