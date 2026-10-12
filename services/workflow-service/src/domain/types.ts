import type { PlatformEventType } from "@quickstart/contracts";

export type WorkflowStatus = "draft" | "active" | "paused";
export type RunStatus = "running" | "succeeded" | "failed" | "skipped";

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
  field: string;
  operator: ConditionOperator;
  value: string;
};

export type ConditionGroup = {
  id: string;
  logic: "and" | "or";
  rules: ConditionRule[];
};

export type ActionKind = "webhook" | "update_tags" | "email_notification" | "agent_handoff";

export type WorkflowAction = {
  id: string;
  kind: ActionKind;
  displayName: string;
  config: Record<string, unknown>;
};

export type WorkflowDefinition = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerEventType: PlatformEventType | string;
  conditionGroup: ConditionGroup | null;
  actions: WorkflowAction[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowListItem = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerEventType: string;
  lastTriggeredAt: string | null;
  successRate7d: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StepRunRecord = {
  stepId: string;
  stepName: string;
  kind: string;
  status: RunStatus;
  summary: string;
  durationMs: number | null;
  inputs: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
};

export type WorkflowRunRecord = {
  id: string;
  workspaceId: string;
  workflowId: string;
  definitionVersion: number;
  status: RunStatus;
  triggeredAt: string;
  completedAt: string | null;
  durationMs: number | null;
  completedSteps: number;
  totalSteps: number;
  stepsSummary: string;
  stepRuns: StepRunRecord[];
};
