export type WorkflowStatus = "draft" | "active" | "paused";

export type WorkflowRunStatus =
  "queued" | "running" | "succeeded" | "failed" | "skipped" | "canceled";

export type WorkflowStepStatus =
  "pending" | "running" | "succeeded" | "failed" | "skipped" | "canceled" | "not_run";

export type WorkflowNodeType =
  | "trigger"
  | "condition"
  | "webhook"
  | "agent_handoff"
  | "notification"
  | "update_tags"
  | "log"
  | "end";

export type WorkflowSourcePort =
  "received" | "matched" | "not_matched" | "success" | "error" | "next";

export type TriggerNodeConfig = {
  trigger_type: "app_event" | "webhook" | "schedule";
  event_type: string;
  run_for: "visitor_messages" | "all_messages";
  agent_scope: string;
  channel_scope: string;
  ignore_workflow_generated: boolean;
  deduplicate_events: boolean;
  sample_payload?: Record<string, unknown>;
};

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists"
  | "greater_than"
  | "less_than";

export type ConditionRule = {
  id: string;
  kind?: "rule";
  field: string;
  operator: ConditionOperator;
  value: string;
  case_sensitive?: boolean;
};

export type ConditionGroup = {
  id: string;
  kind?: "group";
  logic: "and" | "or";
  children: Array<ConditionGroup | ConditionRule>;
  rules?: ConditionRule[];
};

export type ConditionNodeConfig = {
  root_group: ConditionGroup;
  missing_value_behavior: "not_matched" | "matched";
  case_sensitive: boolean;
  routes?: {
    matched_target_node_id?: string;
    not_matched_target_node_id?: string;
  };
};

export type WebhookHeader = {
  key: string;
  value: string;
  is_managed?: boolean;
};

export type WebhookNodeConfig = {
  connection_credential_id?: string | null;
  connection_name?: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: WebhookHeader[];
  body_mode: "json" | "form_data";
  body: string;
  timeout_seconds: number;
  retry_policy: {
    enabled: boolean;
    max_attempts: number;
    backoff_seconds: number;
    retry_transient_only: boolean;
  };
  failure_handling: "error_path" | "stop";
};

export type HandoffNodeConfig = {
  destination_type: "operator_inbox" | "custom";
  queue_id: string;
  queue_name: string;
  priority: "normal" | "high" | "urgent";
  pause_ai: boolean;
  notify_queue_members: boolean;
  if_offline: "keep_in_queue" | "fallback";
  visitor_message: {
    enabled: boolean;
    text: string;
  };
  voice_handoff_message?: {
    enabled: boolean;
    text: string;
  };
  internal_note: string;
  after_handoff: "end_workflow" | "continue";
};

export type NotificationNodeConfig = {
  delivery: "inbox" | "email" | "slack";
  connection_id?: string;
  connection_name?: string;
  channel_id?: string;
  sender?: string;
  recipients: string[];
  subject?: string;
  message: string;
  include_conversation_link: boolean;
  failure_handling: "error_path" | "stop";
};

export type UpdateTagsNodeConfig = {
  target_resource: "conversation" | "lead";
  operation: "add" | "remove" | "replace";
  tags: string[];
};

export type LogNodeConfig = {
  level: "info" | "warn" | "error" | "debug";
  message: string;
};

export type EndNodeConfig = {
  reason: string;
  action_summary?: string;
};

export type WorkflowNodeConfig =
  | ({ type: "trigger" } & TriggerNodeConfig)
  | ({ type: "condition" } & ConditionNodeConfig)
  | ({ type: "webhook" } & WebhookNodeConfig)
  | ({ type: "agent_handoff" } & HandoffNodeConfig)
  | ({ type: "notification" } & NotificationNodeConfig)
  | ({ type: "update_tags" } & UpdateTagsNodeConfig)
  | ({ type: "log" } & LogNodeConfig)
  | ({ type: "end" } & EndNodeConfig)
  | (Record<string, unknown> & { type?: string });

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  name: string;
  subtitle?: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  sourcePort: WorkflowSourcePort;
  target: string;
  targetPort: "in";
  label?: string;
};

export type WorkflowSettings = {
  timezone: string;
  max_run_duration_seconds: number;
  concurrent_runs: number;
  deduplicate_incoming: boolean;
  prevent_recursive: boolean;
  default_failure_handling: "follow_error_path" | "stop";
  retry_policy: {
    strategy: "exponential_backoff" | "linear" | "none";
    max_attempts: number;
    retry_transient_only: boolean;
  };
  failure_notifications: {
    enabled: boolean;
    recipients: string[];
    channels: Array<"inbox" | "email">;
  };
};

export type WorkflowGraph = {
  schema_version: 1;
  entry_node_id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: { x: number; y: number; zoom: number };
};

export type WorkflowValidationSeverity = "error" | "warning";

export type WorkflowValidationIssue = {
  code: string;
  severity: WorkflowValidationSeverity;
  message: string;
  node_id?: string;
  field_path?: string;
};

export type WorkflowValidationResult = {
  valid: boolean;
  blockers: WorkflowValidationIssue[];
  warnings: WorkflowValidationIssue[];
  summary: string;
  checked_at: string;
  revision: number;
};

export type StepExecutionTrace = {
  step_id: string;
  step_name: string;
  node_id?: string;
  node_name?: string;
  node_type: WorkflowNodeType;
  status: WorkflowStepStatus;
  chosen_port?: WorkflowSourcePort;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
  inputs?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    timeout_ms?: number;
    retryable?: boolean;
    attempt?: number;
    retries_disabled?: boolean;
  };
  logs?: string[];
  handled_error?: boolean;
};

export type WorkflowSimulationResult = {
  run_id: string;
  workflow_id: string;
  revision: number;
  status: WorkflowRunStatus;
  mode: "dry_run" | "live";
  duration_ms: number;
  traces: StepExecutionTrace[];
  final_output: Record<string, unknown>;
  handled_errors: boolean;
  error?: string;
};

export type WorkflowStatsSummary = {
  active_workflows: number;
  total_workflows: number;
  runs_today: number;
  runs_yesterday_delta_pct: number;
  success_rate_7d: number | null;
  needs_attention_count: number;
};
