import { randomUUID } from "node:crypto";
import type {
  StepExecutionTrace,
  WorkflowGraph,
  WorkflowSimulationResult,
} from "@quickstart/contracts";
import { evaluateConditionGroup } from "./conditions.js";
import { renderTemplate } from "./template.js";

/** Pure local evaluation: external effects are never dispatched or represented as real responses. */
export function simulateWorkflowGraph(
  graph: WorkflowGraph,
  payload: Record<string, unknown>,
): WorkflowSimulationResult {
  const start = performance.now();
  const traces: StepExecutionTrace[] = [];
  const visited = new Set<string>();
  const outputs: Record<string, unknown> = {};
  let id: string | undefined = graph.entry_node_id;
  let status: WorkflowSimulationResult["status"] = "succeeded";
  let error: string | undefined;
  let handled = false;
  while (id) {
    const node = graph.nodes.find((n) => n.id === id);
    if (!node || visited.has(id) || visited.size >= 100) {
      status = "failed";
      error = "Invalid destination, cycle, or step limit reached";
      break;
    }
    visited.add(id);
    const stepStart = performance.now();
    const started = new Date().toISOString();
    const config = node.config as Record<string, any>;
    let port: StepExecutionTrace["chosen_port"];
    let output: Record<string, unknown> = {};
    let stepError: string | undefined;
    let summary = "";
    try {
      switch (node.type) {
        case "trigger":
          port = "received";
          output = { sample: true };
          summary = "Sample event received";
          break;
        case "condition": {
          const result = evaluateConditionGroup(config.root_group, payload, {
            caseSensitive: config.case_sensitive,
            missingValueBehavior: "treat_as_false",
          });
          port = result.matched ? "matched" : "not_matched";
          output = { matched: result.matched, rules: result.rules };
          summary = result.detail;
          break;
        }
        case "webhook":
          if (!config.url) throw new Error("Configure the request URL before simulation");
          output = {
            simulated: true,
            method: config.method ?? "POST",
            url: renderTemplate(config.url, payload),
          };
          if (config.body) output.body = JSON.parse(renderTemplate(config.body, payload, true));
          summary = "Simulated HTTP request · No request sent";
          port = "success";
          break;
        case "agent_handoff":
          output = { simulated: true, queue_id: config.queue_id ?? null };
          summary = "Simulated handoff · No conversation changed";
          port = "success";
          break;
        case "notification":
          output = {
            simulated: true,
            delivery: config.delivery,
            message: renderTemplate(String(config.message ?? config.body ?? ""), payload),
          };
          summary = "Simulated notification · Nothing sent";
          port = "success";
          break;
        case "update_tags":
          output = { simulated: true, tags: config.tags ?? [] };
          summary = "Simulated tags · No tags changed";
          port = "success";
          break;
        case "log":
          output = { message: renderTemplate(String(config.message ?? ""), payload) };
          summary = "Sample log evaluated";
          port = "next";
          break;
        case "end":
          summary = "Sample path completed";
          break;
        default:
          throw new Error("Unsupported node type");
      }
    } catch (e) {
      stepError = e instanceof Error ? e.message : "Evaluation failed";
      port = "error";
    }
    const edge =
      stepError && config.failure_handling === "stop"
        ? undefined
        : graph.edges.find((e) => e.source === node.id && e.sourcePort === port);
    const isHandled = Boolean(stepError && edge);
    handled ||= isHandled;
    const duration = performance.now() - stepStart;
    traces.push({
      step_id: node.id,
      step_name: node.name,
      node_id: node.id,
      node_name: node.name,
      node_type: node.type,
      status: stepError ? "failed" : "succeeded",
      chosen_port: port,
      duration_ms: Number(duration.toFixed(2)),
      started_at: started,
      completed_at: new Date().toISOString(),
      output,
      error: stepError ? { code: "EVALUATION_FAILED", message: stepError } : undefined,
      logs: [summary],
      handled_error: isHandled,
    });
    outputs[node.id] = output;
    if (stepError && !edge) {
      status = "failed";
      error = stepError;
      break;
    }
    if (node.type === "end") break;
    if (!edge) {
      status = "failed";
      error = `Connect the ${port} path on ${node.name}`;
      break;
    }
    id = edge.target;
  }
  return {
    run_id: `sim_${randomUUID()}`,
    workflow_id: "",
    revision: 0,
    status,
    mode: "dry_run",
    duration_ms: Number((performance.now() - start).toFixed(2)),
    traces,
    final_output: { event: payload, steps: outputs },
    handled_errors: handled,
    error,
  };
}
