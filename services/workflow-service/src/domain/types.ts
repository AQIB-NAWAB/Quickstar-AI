import type {
  PlatformEventType,
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowSettings,
  WorkflowSourcePort,
} from "@quickstart/contracts";

export type WorkflowStatus = "draft" | "active" | "paused";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped" | "canceled";

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

export type ConditionRule = {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  case_sensitive?: boolean;
};

export type ConditionGroup = {
  id: string;
  logic: "and" | "or";
  rules: ConditionRule[];
  groups?: ConditionGroup[];
  children?: Array<ConditionGroup | ConditionRule>;
};

export type ActionKind =
  | "webhook"
  | "update_tags"
  | "email_notification"
  | "agent_handoff"
  | "notification"
  | "log"
  | "end";

export type WorkflowAction = {
  id: string;
  kind: ActionKind;
  displayName: string;
  config: Record<string, unknown>;
};

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  timezone: "UTC",
  max_run_duration_seconds: 60,
  concurrent_runs: 5,
  deduplicate_incoming: true,
  prevent_recursive: true,
  default_failure_handling: "follow_error_path",
  retry_policy: {
    strategy: "exponential_backoff",
    max_attempts: 1, // default 1 means no automatic retries unless opted-in up to 3
    retry_transient_only: true,
  },
  failure_notifications: {
    enabled: true,
    recipients: ["Workflow owner"],
    channels: ["inbox"],
  },
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
  draftGraph: WorkflowGraph | null;
  draftRevision: number;
  settings: WorkflowSettings;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowVersionRecord = {
  id: string;
  workspaceId: string;
  workflowId: string;
  versionNumber: number;
  definitionSnapshot: WorkflowDefinition;
  settingsSnapshot: WorkflowSettings;
  graphSnapshot: WorkflowGraph;
  activatedAt: string;
  activatedByUserId: string | null;
};

export type WorkflowListItem = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerEventType: string;
  draftRevision: number;
  activeVersionNumber: number | null;
  lastTriggeredAt: string | null;
  successRate7d: number | null;
  activity7d?: number[];
  createdAt: string;
  updatedAt: string;
};

export type StepRunRecord = {
  stepId: string;
  stepName: string;
  kind: string;
  status: RunStatus;
  chosenPort?: string;
  summary: string;
  durationMs: number | null;
  inputs: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  startedAt?: string;
  completedAt?: string;
};

export type WorkflowRunRecord = {
  id: string;
  workspaceId: string;
  workflowId: string;
  definitionVersion: number;
  versionId: string | null;
  mode: "live" | "dry_run";
  replayOfRunId: string | null;
  status: RunStatus;
  triggeredAt: string;
  completedAt: string | null;
  durationMs: number | null;
  completedSteps: number;
  totalSteps: number;
  stepsSummary: string;
  handledErrors: boolean;
  stepRuns: StepRunRecord[];
  definitionSnapshot?: Record<string, unknown> | null;
};

/**
 * Deterministically adapts a legacy linear workflow (trigger + conditionGroup + actions)
 * into a valid modern WorkflowGraph (trigger -> condition -> action chain -> end).
 */
export function convertLinearToGraph(wf: {
  id: string;
  name: string;
  triggerEventType: string;
  conditionGroup: ConditionGroup | null;
  actions: WorkflowAction[];
}): WorkflowGraph {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const triggerId = `node_trigger_${wf.id.slice(0, 8)}`;
  nodes.push({
    id: triggerId,
    type: "trigger",
    name: "Message received",
    subtitle: wf.triggerEventType,
    position: { x: 100, y: 150 },
    config: {
      trigger_type: "app_event",
      event_type: wf.triggerEventType,
      run_for: "visitor_messages",
      agent_scope: "all",
      channel_scope: "all",
      ignore_workflow_generated: true,
      deduplicate_events: true,
      sample_payload: {
        id: "evt_sample",
        type: wf.triggerEventType,
        message: { text: "Sample customer message", sender_type: "visitor" },
        conversation_id: "conv_sample",
      },
    },
  });

  let currentSourceId = triggerId;
  let currentSourcePort: WorkflowSourcePort = "received";
  let xOffset = 360;

  if (wf.conditionGroup && wf.conditionGroup.rules && wf.conditionGroup.rules.length > 0) {
    const conditionId = `node_condition_${wf.id.slice(0, 8)}`;
    nodes.push({
      id: conditionId,
      type: "condition",
      name: "Match request",
      subtitle: `${wf.conditionGroup.rules.length} rules`,
      position: { x: xOffset, y: 150 },
      config: {
        root_group: {
          id: wf.conditionGroup.id || "root_grp",
          logic: wf.conditionGroup.logic,
          children: wf.conditionGroup.rules,
          rules: wf.conditionGroup.rules,
        },
        missing_value_behavior: "not_matched",
        case_sensitive: false,
      },
    });

    edges.push({
      id: `edge_${currentSourceId}_${conditionId}`,
      source: currentSourceId,
      sourcePort: currentSourcePort,
      target: conditionId,
      targetPort: "in",
    });

    // Unmatched condition routes to an End node
    const notMatchedEndId = `node_end_unmatched_${wf.id.slice(0, 8)}`;
    nodes.push({
      id: notMatchedEndId,
      type: "end",
      name: "End workflow",
      subtitle: "No action needed",
      position: { x: xOffset + 240, y: 80 },
      config: { reason: "condition_not_matched", action_summary: "No action needed" },
    });
    edges.push({
      id: `edge_${conditionId}_${notMatchedEndId}`,
      source: conditionId,
      sourcePort: "not_matched",
      target: notMatchedEndId,
      targetPort: "in",
      label: "Not matched",
    });

    currentSourceId = conditionId;
    currentSourcePort = "matched" as any;
    xOffset += 260;
  }

  for (let i = 0; i < (wf.actions || []).length; i++) {
    const act = wf.actions[i];
    const nodeType: any =
      act.kind === "email_notification"
        ? "notification"
        : act.kind === "agent_handoff"
          ? "agent_handoff"
          : act.kind === "update_tags"
            ? "update_tags"
            : act.kind === "webhook"
              ? "webhook"
              : "log";

    const nodeId = act.id || `node_act_${i}_${wf.id.slice(0, 8)}`;
    nodes.push({
      id: nodeId,
      type: nodeType,
      name: act.displayName || act.kind,
      position: { x: xOffset, y: 260 },
      config: act.config || {},
    });

    edges.push({
      id: `edge_${currentSourceId}_${nodeId}`,
      source: currentSourceId,
      sourcePort: currentSourcePort,
      target: nodeId,
      targetPort: "in",
      label: currentSourcePort === "matched" ? "Matched" : undefined,
    });

    currentSourceId = nodeId;
    currentSourcePort = "success" as any;
    xOffset += 260;
  }

  const endId = `node_end_${wf.id.slice(0, 8)}`;
  nodes.push({
    id: endId,
    type: "end",
    name: "End workflow",
    subtitle: "Completed",
    position: { x: xOffset, y: 260 },
    config: { reason: "completed" },
  });

  edges.push({
    id: `edge_${currentSourceId}_${endId}`,
    source: currentSourceId,
    sourcePort: currentSourcePort,
    target: endId,
    targetPort: "in",
    label: currentSourcePort === "success" ? "Success" : undefined,
  });

  return {
    schema_version: 1,
    entry_node_id: triggerId,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
