export type WorkflowStatus = "draft" | "active" | "paused";

export interface WorkflowListItem {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerEventType: string;
  lastTriggeredAt: string | null;
  successRate7d: number | null; // e.g. 98.4 or null
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTrigger {
  id: string;
  eventType: string; // e.g. "message.appended"
  displayName?: string;
  description?: string;
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists"
  | "greater_than"
  | "less_than";

export interface ConditionRule {
  id: string;
  field: string; // e.g. "message.text"
  operator: ConditionOperator;
  value: string;
}

export interface ConditionGroup {
  id: string;
  logic: "and" | "or";
  rules: ConditionRule[];
}

export type ActionKind =
  | "webhook"
  | "update_tags"
  | "email_notification"
  | "agent_handoff";

export interface WebhookActionConfig {
  name: string;
  method: "POST" | "PUT" | "PATCH" | "GET" | "DELETE";
  url: string;
  authType: "none" | "secret";
  secretName?: string;
  body?: string;
}

export interface UpdateTagsActionConfig {
  name: string;
  targetResource: "conversation" | "lead";
  operation: "add" | "remove";
  tags: string[];
}

export interface EmailActionConfig {
  name: string;
  recipients: string[];
  subject: string;
  body: string;
}

export interface HandoffActionConfig {
  name: string;
  destinationType: "human" | "agent" | "queue";
  destination: string;
  note?: string;
}

export type ActionConfig =
  | WebhookActionConfig
  | UpdateTagsActionConfig
  | EmailActionConfig
  | HandoffActionConfig;

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
  trigger: WorkflowTrigger;
  conditionGroup?: ConditionGroup | null;
  actions: WorkflowAction[];
  createdAt?: string;
  updatedAt?: string;
}

export type RunStatus = "running" | "succeeded" | "failed" | "skipped";

export interface StepRun {
  stepId: string;
  stepName: string;
  kind: "trigger" | "condition" | ActionKind;
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
  definitionVersion?: number;
  status: RunStatus;
  triggeredAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  completedSteps: number;
  totalSteps: number;
  stepsSummary: string; // e.g. "3 / 3" or "Condition not matched"
  stepRuns: StepRun[];
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "not_found"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

export interface WorkflowRepository {
  listWorkflows(workspaceId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowListItem[]>>;
  getWorkflow(workspaceId: string, workflowId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowDefinition>>;
  saveWorkflow(workspaceId: string, workflow: WorkflowDefinition): Promise<RepositoryResult<WorkflowDefinition>>;
  deleteWorkflow(workspaceId: string, workflowId: string): Promise<RepositoryResult<boolean>>;
  listRuns(workspaceId: string, workflowId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowRun[]>>;
  getRun(workspaceId: string, workflowId: string, runId: string, signal?: AbortSignal): Promise<RepositoryResult<WorkflowRun>>;
}
