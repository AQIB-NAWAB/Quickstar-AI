import { PLATFORM_EVENT_TYPES } from "./platform-events.js";
import type {
  ConditionGroup,
  ConditionRule,
  WorkflowGraph,
  WorkflowNode,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "./workflow-graph.js";

const MAX_NODES = 100;
const MAX_EDGES = 200;
const MAX_CONDITION_DEPTH = 5;
const MAX_CONDITION_RULES = 100;

export function validateWorkflowGraph(
  graph: WorkflowGraph | null | undefined,
  revision = 1,
): WorkflowValidationResult {
  const blockers: WorkflowValidationIssue[] = [];
  const warnings: WorkflowValidationIssue[] = [];

  if (!isWorkflowGraphShape(graph) || graph.nodes.length === 0) {
    blockers.push({
      code: "EMPTY_GRAPH",
      severity: "error",
      message: "The workflow graph must contain at least an entry trigger node.",
    });
    return {
      valid: false,
      blockers,
      warnings,
      summary: "Workflow graph is empty",
      checked_at: new Date().toISOString(),
      revision,
    };
  }

  if (graph.nodes.length > MAX_NODES) {
    blockers.push({
      code: "MAX_NODES_EXCEEDED",
      severity: "error",
      message: `The graph exceeds the maximum limit of ${MAX_NODES} nodes.`,
    });
  }

  if (graph.edges.length > MAX_EDGES) {
    blockers.push({
      code: "MAX_EDGES_EXCEEDED",
      severity: "error",
      message: `The graph exceeds the maximum limit of ${MAX_EDGES} edges.`,
    });
  }

  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of graph.nodes) {
    if (nodeMap.has(node.id)) {
      blockers.push({
        code: "DUPLICATE_NODE_ID",
        severity: "error",
        message: `Duplicate node ID "${node.id}" found in graph.`,
        node_id: node.id,
      });
    }
    nodeMap.set(node.id, node);
  }

  if (graph.nodes.filter((n) => n.type === "trigger").length !== 1)
    blockers.push({
      code: "TRIGGER_COUNT",
      severity: "error",
      message: "Exactly one trigger is required.",
    });
  // 1. Entry node validation
  const entryNode = nodeMap.get(graph.entry_node_id);
  if (!entryNode) {
    blockers.push({
      code: "ENTRY_NODE_NOT_FOUND",
      severity: "error",
      message: `Entry node "${graph.entry_node_id}" does not exist in the graph.`,
    });
  } else if (entryNode.type !== "trigger") {
    blockers.push({
      code: "ENTRY_NODE_NOT_TRIGGER",
      severity: "error",
      message: "Entry node must be a Trigger node.",
      node_id: entryNode.id,
    });
  }

  // Incoming edges check on trigger
  for (const edge of graph.edges) {
    if (edge.target === graph.entry_node_id) {
      blockers.push({
        code: "TRIGGER_HAS_INCOMING_EDGE",
        severity: "error",
        message: "Trigger node cannot have incoming edges.",
        node_id: graph.entry_node_id,
      });
      break;
    }
  }

  // 2. Port constraint: at most one outgoing edge per source port
  const portSeen = new Set<string>();
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id))
      blockers.push({
        code: "DUPLICATE_EDGE_ID",
        severity: "error",
        message: "Each connection must have a unique ID",
      });
    edgeIds.add(edge.id);
    const portKey = `${edge.source}:${edge.sourcePort}`;
    if (portSeen.has(portKey)) {
      blockers.push({
        code: "MULTIPLE_EDGES_ON_PORT",
        severity: "error",
        message: `Port "${edge.sourcePort}" on node "${edge.source}" has multiple outgoing edges. Only one edge per port is allowed.`,
        node_id: edge.source,
      });
    }
    portSeen.add(portKey);
    const source = nodeMap.get(edge.source);
    if (source && !workflowOutputPorts(source.type).includes(edge.sourcePort))
      blockers.push({
        code: "INVALID_PORT",
        severity: "error",
        message: "Unknown output port",
        node_id: source.id,
      });
    if (edge.targetPort !== "in")
      blockers.push({ code: "INVALID_PORT", severity: "error", message: "Unknown input port" });

    if (!nodeMap.has(edge.source)) {
      blockers.push({
        code: "EDGE_SOURCE_NOT_FOUND",
        severity: "error",
        message: `Edge references non-existent source node "${edge.source}".`,
      });
    }
    if (!nodeMap.has(edge.target)) {
      blockers.push({
        code: "EDGE_TARGET_NOT_FOUND",
        severity: "error",
        message: `Edge references non-existent target node "${edge.target}".`,
      });
    }
  }

  // 3. Cycle Detection (DAG check)
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        blockers.push({
          code: "CYCLE_DETECTED",
          severity: "error",
          message: "A circular dependency/cycle was detected in the workflow graph.",
          node_id: node.id,
        });
        break;
      }
    }
  }

  // 4. Per-node validation
  for (const node of graph.nodes) {
    const cfg = (node.config || {}) as Record<string, unknown>;
    const required =
      node.type === "trigger"
        ? ["received"]
        : node.type === "condition"
          ? ["matched", "not_matched"]
          : node.type === "end"
            ? []
            : node.type === "log"
              ? ["next"]
              : ["success"];
    for (const port of required)
      if (!graph.edges.some((e) => e.source === node.id && e.sourcePort === port))
        blockers.push({
          code: "REQUIRED_ROUTE_MISSING",
          severity: "error",
          node_id: node.id,
          message: `${node.name}: connect the ${port} route.`,
        });
    switch (node.type) {
      case "trigger": {
        const eventType = cfg.event_type as string | undefined;
        if (eventType && !(PLATFORM_EVENT_TYPES as readonly string[]).includes(eventType))
          blockers.push({
            code: "UNSUPPORTED_EVENT",
            severity: "error",
            node_id: node.id,
            message: "This event has no declared platform producer.",
          });
        if (cfg.trigger_type && cfg.trigger_type !== "app_event")
          blockers.push({
            code: "UNSUPPORTED_TRIGGER",
            severity: "error",
            node_id: node.id,
            message: "Only app-event triggers are connected to the worker.",
          });
        if (!eventType || typeof eventType !== "string" || !eventType.trim()) {
          blockers.push({
            code: "TRIGGER_MISSING_EVENT_TYPE",
            severity: "error",
            message: `Trigger node "${node.name}" requires an event type.`,
            node_id: node.id,
            field_path: "event_type",
          });
        }
        break;
      }

      case "condition": {
        const rootGroup = cfg.root_group as ConditionGroup | undefined;
        if (!rootGroup) {
          blockers.push({
            code: "CONDITION_MISSING_RULES",
            severity: "error",
            message: `Condition node "${node.name}" has no rules configured.`,
            node_id: node.id,
            field_path: "root_group",
          });
        } else {
          let ruleCount = 0;
          let maxDepth = 0;

          function inspectGroup(grp: ConditionGroup, depth: number) {
            maxDepth = Math.max(maxDepth, depth);
            if (depth > MAX_CONDITION_DEPTH) return;
            const children = grp.children ?? [
              ...(grp.rules ?? []),
              ...((grp as unknown as { groups?: ConditionGroup[] }).groups ?? []),
            ];
            if (children.length === 0) {
              blockers.push({
                code: "EMPTY_CONDITION_GROUP",
                severity: "error",
                message: `Condition node "${node.name}" contains an empty rule group.`,
                node_id: node.id,
              });
            }
            for (const child of children) {
              if ("logic" in child) {
                inspectGroup(child as ConditionGroup, depth + 1);
              } else {
                ruleCount++;
                const rule = child as ConditionRule;
                if (!rule.field || !rule.field.trim()) {
                  blockers.push({
                    code: "CONDITION_RULE_MISSING_FIELD",
                    severity: "error",
                    message: `Condition node "${node.name}" has a rule with missing field name.`,
                    node_id: node.id,
                  });
                }
                if (
                  ![
                    "equals",
                    "not_equals",
                    "contains",
                    "not_contains",
                    "exists",
                    "not_exists",
                    "greater_than",
                    "less_than",
                    "starts_with",
                    "ends_with",
                    "is_empty",
                    "is_not_empty",
                    "greater_than_or_equal",
                    "less_than_or_equal",
                  ].includes(rule.operator)
                ) {
                  blockers.push({
                    code: "CONDITION_RULE_MISSING_OPERATOR",
                    severity: "error",
                    message: `Condition node "${node.name}" has a rule with missing operator.`,
                    node_id: node.id,
                  });
                }
              }
            }
          }

          inspectGroup(rootGroup, 1);

          if (maxDepth > MAX_CONDITION_DEPTH) {
            blockers.push({
              code: "CONDITION_DEPTH_EXCEEDED",
              severity: "error",
              message: `Condition nesting exceeds maximum depth of ${MAX_CONDITION_DEPTH}.`,
              node_id: node.id,
            });
          }
          if (ruleCount > MAX_CONDITION_RULES) {
            blockers.push({
              code: "CONDITION_RULE_LIMIT_EXCEEDED",
              severity: "error",
              message: `Condition exceeds maximum limit of ${MAX_CONDITION_RULES} rules.`,
              node_id: node.id,
            });
          }
        }
        break;
      }

      case "webhook": {
        const url = cfg.url as string | undefined;
        if (!url || typeof url !== "string" || !url.trim()) {
          blockers.push({
            code: "WEBHOOK_MISSING_URL",
            severity: "error",
            message: `HTTP Request node "${node.name}" requires a destination URL.`,
            node_id: node.id,
            field_path: "url",
          });
        }

        const retryPolicy = cfg.retry_policy as
          { enabled?: boolean; max_attempts?: number } | undefined;
        if (!retryPolicy || !retryPolicy.enabled || (retryPolicy.max_attempts ?? 1) <= 1) {
          warnings.push({
            code: "WEBHOOK_RETRIES_DISABLED",
            severity: "warning",
            message: `HTTP Request "${node.name}": Retries are disabled. A timeout will follow the error path without another attempt.`,
            node_id: node.id,
            field_path: "retry_policy",
          });
        }

        // Check if error path is connected
        const hasErrorEdge = graph.edges.some(
          (e) => e.source === node.id && e.sourcePort === "error",
        );
        if (!hasErrorEdge && cfg.failure_handling !== "stop") {
          warnings.push({
            code: "ERROR_PATH_UNCONNECTED",
            severity: "warning",
            message: `HTTP Request "${node.name}": Error path is not connected. Step failures will terminate the workflow.`,
            node_id: node.id,
          });
        }
        break;
      }

      case "agent_handoff": {
        const queueId = cfg.queue_id as string | undefined;
        if (!queueId || typeof queueId !== "string" || !queueId.trim()) {
          blockers.push({
            code: "HANDOFF_MISSING_QUEUE",
            severity: "error",
            message: `Handoff node "${node.name}" requires a destination operator queue.`,
            node_id: node.id,
            field_path: "queue_id",
          });
        }
        break;
      }

      case "notification": {
        const delivery = cfg.delivery as string | undefined;
        const recipients = cfg.recipients as string[] | undefined;
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          blockers.push({
            code: "NOTIFICATION_MISSING_RECIPIENTS",
            severity: "error",
            message: `Notification node "${node.name}" requires at least one recipient.`,
            node_id: node.id,
            field_path: "recipients",
          });
        }
        if (delivery === "email") {
          const subject = cfg.subject as string | undefined;
          if (!subject || !subject.trim()) {
            warnings.push({
              code: "EMAIL_MISSING_SUBJECT",
              severity: "warning",
              message: `Email notification "${node.name}" has no subject specified.`,
              node_id: node.id,
              field_path: "subject",
            });
          }
        }
        break;
      }

      case "update_tags": {
        const tags = cfg.tags as string[] | undefined;
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          blockers.push({
            code: "TAGS_EMPTY",
            severity: "error",
            message: `Update Tags node "${node.name}" must specify at least one tag.`,
            node_id: node.id,
            field_path: "tags",
          });
        }
        break;
      }
    }
  }

  const valid = blockers.length === 0;
  const summary = valid
    ? blockers.length === 0 && warnings.length === 0
      ? "Workflow is fully configured and ready to activate."
      : `Workflow is valid with ${warnings.length} warning(s).`
    : `Workflow has ${blockers.length} blocking issue(s) that must be resolved before activation.`;

  return {
    valid,
    blockers,
    warnings,
    summary,
    checked_at: new Date().toISOString(),
    revision,
  };
}

export function workflowOutputPorts(type: string): string[] {
  switch (type) {
    case "trigger":
      return ["received"];
    case "condition":
      return ["matched", "not_matched"];
    case "end":
      return [];
    case "log":
      return ["next"];
    default:
      return ["success", "error"];
  }
}
export function isWorkflowGraphShape(value: unknown): value is WorkflowGraph {
  const object = (v: unknown): v is Record<string, any> =>
    Boolean(v && typeof v === "object" && !Array.isArray(v));
  if (
    !object(value) ||
    value.schema_version !== 1 ||
    typeof value.entry_node_id !== "string" ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    value.nodes.length > 100 ||
    value.edges.length > 200
  )
    return false;
  const types = [
    "trigger",
    "condition",
    "webhook",
    "agent_handoff",
    "notification",
    "update_tags",
    "log",
    "end",
  ];
  for (const node of value.nodes) {
    if (
      !object(node) ||
      typeof node.id !== "string" ||
      typeof node.name !== "string" ||
      !types.includes(node.type) ||
      !object(node.config) ||
      !object(node.position) ||
      !Number.isFinite(node.position.x) ||
      !Number.isFinite(node.position.y)
    )
      return false;
    for (const key of ["event_type", "url", "subject", "queue_id", "message", "body"]) {
      if (node.config[key] !== undefined && typeof node.config[key] !== "string") return false;
    }
    const stack: [unknown, number][] = [[node.config, 0]];
    let count = 0;
    while (stack.length) {
      const [v, depth] = stack.pop()!;
      if (depth > 20 || ++count > 5000) return false;
      if (typeof v === "string" && v.length > 262144) return false;
      if (v && typeof v === "object")
        for (const [key, child] of Object.entries(v)) {
          if (["__proto__", "constructor", "prototype"].includes(key)) return false;
          stack.push([child, depth + 1]);
        }
    }
    if (node.type === "condition") {
      const groups: Array<[unknown, number]> = [[node.config.root_group, 1]];
      let rules = 0;
      while (groups.length) {
        const [g, depth] = groups.pop()!;
        if (!object(g) || depth > 5 || !["and", "or"].includes(g.logic)) return false;
        if (
          (g.rules !== undefined && !Array.isArray(g.rules)) ||
          (g.groups !== undefined && !Array.isArray(g.groups))
        )
          return false;
        const children = g.children ?? [...(g.rules ?? []), ...(g.groups ?? [])];
        if (!Array.isArray(children)) return false;
        for (const c of children) {
          if (!object(c)) return false;
          if ("logic" in c) groups.push([c, depth + 1]);
          else if (
            typeof c.field !== "string" ||
            typeof c.operator !== "string" ||
            typeof c.value !== "string" ||
            ++rules > 100
          )
            return false;
        }
      }
    }
  }
  return value.edges.every(
    (e: unknown) =>
      object(e) &&
      typeof e.id === "string" &&
      typeof e.source === "string" &&
      typeof e.target === "string" &&
      typeof e.sourcePort === "string" &&
      e.targetPort === "in",
  );
}
