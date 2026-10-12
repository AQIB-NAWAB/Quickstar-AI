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
  AgentBuiltinWebToolDefinition,
  AgentHttpToolDefinition,
  AgentMcpToolDefinition,
  AgentToolDefinition,
  ToolParameterSchema,
} from "./agent-tools.js";

export type { ToolCallRecord, ToolCallStatus, UpsertToolCallBody } from "./tool-calls.js";

export {
  DEFAULT_TOOL_TIMEOUT_MS,
  MAX_TOOL_ARGUMENT_BYTES,
  MAX_TOOL_ROUNDS_PER_TURN,
  MAX_TOOL_TIMEOUT_MS,
  MAX_TOOLS_PER_AGENT,
} from "./agent-tools.js";

export type {
  ChatMessage,
  ChatMessageRole,
  CompletionFinishReason,
  CompletionRequestBody,
  CompletionResponseBody,
  ModelToolCall,
  ModelToolDefinition,
  DecideRequestBody,
  DecideResponseBody,
  JevQuestion,
  JevQuestionType,
  ModelCredentialSource,
  ModelReference,
  ModelRoutingMode,
  TokenUsage,
} from "./model-gateway.js";

export type { MembershipSnapshot } from "./membership.js";

export {
  PLATFORM_EVENTS_TOPIC,
  PLATFORM_EVENT_TYPES,
  isPlatformEventType,
  type PlatformEventType,
  type PlatformEventEnvelope,
  type ConversationHandedOffData,
} from "./platform-events.js";

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

export type {
  BusinessInput,
  LeadRunInput,
  LeadPolicy,
  LeadEvidence,
  CampaignLeadDelivery,
} from "./lead-generation.js";
