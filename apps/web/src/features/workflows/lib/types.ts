import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  WorkflowSourcePort,
  WorkflowSettings,
  WorkflowValidationResult,
  WorkflowValidationIssue,
  WorkflowSimulationResult,
  StepExecutionTrace,
  WorkflowStatsSummary,
} from "@quickstart/contracts";

export type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  WorkflowSourcePort,
  WorkflowSettings,
  WorkflowValidationResult,
  WorkflowValidationIssue,
  WorkflowSimulationResult,
  StepExecutionTrace,
  WorkflowStatsSummary,
};

export type WorkflowStatus = "draft" | "active" | "paused";

export interface WorkflowListItem {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerEventType: string;
  draftRevision?: number;
  activeVersionNumber?: number | null;
  lastTriggeredAt: string | null;
  successRate7d: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTrigger {
  id: string;
  eventType: string;
  displayName?: string;
  description?: string;
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "exists"
  | "not_exists"
  | "is_empty"
  | "is_not_empty"
  | "matches_regex";

export interface ConditionRule {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  case_sensitive?: boolean;
}

export interface ConditionGroup {
  id: string;
  logic: "and" | "or";
  rules: ConditionRule[];
  groups?: ConditionGroup[];
}

export type ActionKind =
  | "webhook"
  | "update_tags"
  | "email_notification"
  | "notification"
  | "agent_handoff"
  | "log"
  | "end";

export interface WebhookActionConfig {
  name?: string;
  method: "POST" | "PUT" | "PATCH" | "GET" | "DELETE";
  url: string;
  authType: "none" | "secret" | "bearer" | "basic";
  secretName?: string;
  token?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: string;
  timeout_ms?: number;
}

export interface UpdateTagsActionConfig {
  name?: string;
  targetResource: "conversation" | "customer" | "ticket" | "lead";
  operation: "add" | "remove" | "set";
  tags: string[];
}

export interface NotificationActionConfig {
  name?: string;
  delivery: "inbox" | "email";
  sender?: string;
  recipients: string[];
  subject: string;
  body: string;
}

export interface HandoffActionConfig {
  name?: string;
  destinationType: "human" | "agent" | "team";
  destination?: string;
  queue_id?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  pause_ai_replies?: boolean;
  visitor_message?: string;
  internal_note?: string;
  note?: string;
}

export type ActionConfig =
  | WebhookActionConfig
  | UpdateTagsActionConfig
  | NotificationActionConfig
  | EmailActionConfig
  | HandoffActionConfig
  | Record<string, unknown>;

export interface WorkflowAction {
  id: string;
  kind: ActionKind;
  displayName: string;
  config: ActionConfig;
}

export interface WorkflowDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  version?: number;
  draft_graph?: WorkflowGraph | null;
  draft_revision?: number;
  settings?: WorkflowSettings;
  active_version_id?: string | null;
  active_version_number?: number | null;
  trigger: WorkflowTrigger;
  conditionGroup?: ConditionGroup | null;
  actions: WorkflowAction[];
  createdAt?: string;
  updatedAt?: string;
}

export type RunStatus = "running" | "succeeded" | "failed" | "skipped" | "queued" | "canceled";

export interface StepRun {
  stepId: string;
  stepName: string;
  kind: "trigger" | "condition" | ActionKind | string;
  status: RunStatus;
  durationMs?: number | null;
  summary: string;
  inputs?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: {
    code?: string;
    message: string;
    httpStatus?: number;
    details?: string;
    requestId?: string;
  } | null;
}

export interface WorkflowRun {
  id: string;
  workspaceId: string;
  workflowId: string;
  workflowName?: string;
  definitionVersion?: number;
  status: RunStatus;
  triggeredAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  completedSteps: number;
  totalSteps: number;
  stepsSummary: string;
  stepRuns: StepRun[];
}

export interface WorkflowTemplateItem {
  id: string;
  name: string;
  category: "Sales & Leads" | "Support" | "Customer Success" | "Resolution" | "Operations" | "Integrations";
  description: string;
  trigger_event_type: string;
  badge?: string;
  steps_count: number;
  graph: WorkflowGraph;
}

export interface WorkflowStatsData {
  activeWorkflows: number;
  totalWorkflows: number;
  totalRuns7d: number | null;
  avgSuccessRate: number | null;
  avgExecutionTimeMs: number | null;
  runsToday: number;
  runsYesterdayDeltaPct: number;
  needsAttentionCount: number;
  dailyActivity: Array<{
    date: string;
    runs: number;
    success: number;
    failed: number;
  }>;
}

export interface EmailActionConfig {
  name?: string;
  delivery?: "inbox" | "email";
  sender?: string;
  recipients: string[];
  subject: string;
  body: string;
}

export interface WorkflowRepository {
  listWorkflows(workspaceId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowListItem[]>>;
  getWorkflow(workspaceId: string, workflowId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowDefinition>>;
  saveWorkflow(workspaceId: string, workflow: WorkflowDefinition): Promise<RepositoryResult<WorkflowDefinition>>;
  deleteWorkflow(workspaceId: string, workflowId: string): Promise<RepositoryResult<boolean>>;
  listRuns(workspaceId: string, workflowId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowRun[]>>;
  getRun(workspaceId: string, workflowId: string, runId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowRun>>;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "not_found"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };
