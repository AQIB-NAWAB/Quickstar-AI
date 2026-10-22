import { normalizeAgentGraph } from "@quickstart/contracts";

import type {
  AgentGraph,
  AgentGraphEdge,
  AgentGraphNode,
  GraphValidationIssue,
} from "@quickstart/contracts";
import type { CanvasFlowNode, CanvasFlowEdge } from "./types";

export function graphToFlowElements(
  graph: AgentGraph,
  issues: GraphValidationIssue[] = [],
  executingNodeId?: string | null,
): { nodes: CanvasFlowNode[]; edges: CanvasFlowEdge[] } {
  graph = normalizeAgentGraph(graph);
  const issuesByNode = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.node_id) {
      const list = issuesByNode.get(issue.node_id) ?? [];
      list.push(issue.message);
      issuesByNode.set(issue.node_id, list);
    }
  }

  const nodes: CanvasFlowNode[] = graph.nodes.map((node) => {
    const nodeIssues = issuesByNode.get(node.id) ?? [];
    const hasErrors = nodeIssues.length > 0;
    const isExecuting = executingNodeId === node.id;

    return {
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: {
        type: node.type,
        label: node.name,
        config: node.config,
        presentation: node.presentation,
        hasErrors,
        errorMessage: nodeIssues[0],
        isExecuting,
      },
    };
  });

  const edges: CanvasFlowEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source || edge.source_node_id || "",
    sourceHandle: edge.source_port || edge.source_port_id || "out",
    target: edge.target || edge.target_node_id || "",
    targetHandle: edge.target_port || edge.target_port_id || "in",
    type: "canvasEdge",
    data: {
      label: edge.label,
    },
  }));

  return { nodes, edges };
}

export function flowElementsToGraph(
  nodes: CanvasFlowNode[],
  edges: CanvasFlowEdge[],
  viewport = { x: 0, y: 0, zoom: 1 },
): AgentGraph {
  const entryNode = nodes.find((n) => n.data.type === "entrypoint");

  const graphNodes: AgentGraphNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.type,
    name: n.data.label || n.data.type,
    position: {
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    },
    config: n.data.config as any,
    presentation: n.data.presentation,
  }));

  const graphEdges: AgentGraphEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    source_port: e.sourceHandle || "out",
    target: e.target,
    target_port: e.targetHandle || "in",
    label: e.data?.label,
  }));

  return {
    schema_version: 1,
    entry_node_id: entryNode?.id || "",
    nodes: graphNodes,
    edges: graphEdges,
    viewport,
  };
}
