import type { AgentGraph, AgentGraphNode, AgentGraphEdge } from "@quickstart/contracts";
import type { AgentSnapshot, AgentVersionDiff, VersionFieldDiff } from "../domain/types.js";

const DIFF_FIELDS = [
  "name",
  "description",
  "instructions",
  "environment",
  "model_settings",
  "channels",
  "voice",
  "tools",
  "graph",
  "release_notes",
] as const;

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export type GraphComparisonSummary = {
  nodes_added: string[];
  nodes_removed: string[];
  nodes_updated: string[];
  edges_added: string[];
  edges_removed: string[];
  edges_retargeted: string[];
  presentation_only_changes: boolean;
};

export function compareGraphs(
  left: AgentGraph | null | undefined,
  right: AgentGraph | null | undefined,
): GraphComparisonSummary {
  const leftNodes: AgentGraphNode[] = left?.nodes ?? [];
  const rightNodes: AgentGraphNode[] = right?.nodes ?? [];
  const leftEdges: AgentGraphEdge[] = left?.edges ?? [];
  const rightEdges: AgentGraphEdge[] = right?.edges ?? [];

  const leftNodeMap = new Map(leftNodes.map((n) => [n.id, n]));
  const rightNodeMap = new Map(rightNodes.map((n) => [n.id, n]));

  const nodes_added: string[] = [];
  const nodes_removed: string[] = [];
  const nodes_updated: string[] = [];
  let presentation_only_changes = false;

  for (const [id, rNode] of rightNodeMap.entries()) {
    const lNode = leftNodeMap.get(id);
    if (!lNode) {
      nodes_added.push(rNode.name || id);
    } else {
      const configDiff = stableJson(lNode.config) !== stableJson(rNode.config);
      const nameDiff = lNode.name !== rNode.name;
      const typeDiff = lNode.type !== rNode.type;
      const posDiff =
        lNode.position.x !== rNode.position.x || lNode.position.y !== rNode.position.y;

      if (configDiff || nameDiff || typeDiff) {
        nodes_updated.push(rNode.name || id);
      } else if (posDiff) {
        presentation_only_changes = true;
      }
    }
  }

  for (const [id, lNode] of leftNodeMap.entries()) {
    if (!rightNodeMap.has(id)) {
      nodes_removed.push(lNode.name || id);
    }
  }

  const leftEdgeMap = new Map(leftEdges.map((e) => [e.id, e]));
  const rightEdgeMap = new Map(rightEdges.map((e) => [e.id, e]));

  const edges_added: string[] = [];
  const edges_removed: string[] = [];
  const edges_retargeted: string[] = [];

  for (const [id, rEdge] of rightEdgeMap.entries()) {
    const lEdge = leftEdgeMap.get(id);
    if (!lEdge) {
      edges_added.push(id);
    } else if (
      lEdge.source !== rEdge.source ||
      lEdge.target !== rEdge.target ||
      lEdge.source_port !== rEdge.source_port ||
      lEdge.target_port !== rEdge.target_port
    ) {
      edges_retargeted.push(id);
    }
  }

  for (const [id] of leftEdgeMap.entries()) {
    if (!rightEdgeMap.has(id)) {
      edges_removed.push(id);
    }
  }

  return {
    nodes_added,
    nodes_removed,
    nodes_updated,
    edges_added,
    edges_removed,
    edges_retargeted,
    presentation_only_changes,
  };
}

export function diffSnapshots(
  leftId: string,
  rightId: string,
  left: AgentSnapshot,
  right: AgentSnapshot,
): AgentVersionDiff {
  const fields: Record<string, VersionFieldDiff> = {};

  for (const key of DIFF_FIELDS) {
    const before = left[key];
    const after = right[key];
    if (stableJson(before) !== stableJson(after)) {
      if (key === "graph") {
        const summary = compareGraphs(
          before as AgentGraph | null | undefined,
          after as AgentGraph | null | undefined,
        );
        fields[key] = {
          before,
          after: {
            ...((after as object) || {}),
            _diff_summary: summary,
          },
        };
      } else {
        fields[key] = { before, after };
      }
    }
  }

  return { leftId, rightId, fields };
}
