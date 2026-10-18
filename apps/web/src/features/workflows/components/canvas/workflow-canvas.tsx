"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  applyNodeChanges,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import { workflowOutputPorts } from "@quickstart/contracts";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { WORKFLOW_CUSTOM_NODE_TYPES } from "./workflow-custom-nodes";
import type { WorkflowGraph } from "../../lib/types";
export type WorkflowCanvasProps = {
  initialGraph: WorkflowGraph;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onChangeGraph: (graph: WorkflowGraph) => void;
  onOpenActionCatalog: () => void;
  isReadOnly?: boolean;
};
export function WorkflowCanvas({
  initialGraph: g,
  selectedNodeId,
  onSelectNode,
  onChangeGraph,
  onOpenActionCatalog,
  isReadOnly = false,
}: WorkflowCanvasProps) {
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  useEffect(() => {
    if (!flow) return;
    const frame = requestAnimationFrame(
      () => void flow.fitView({ padding: 0.12, minZoom: 0.4, maxZoom: 0.9 }),
    );
    return () => cancelAnimationFrame(frame);
  }, [flow, selectedNodeId]);
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const nodes: Node[] = useMemo(
    () =>
      g.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        measured: sizes[n.id],
        selected: n.id === selectedNodeId,
        data: { ...n },
      })),
    [g.nodes, selectedNodeId, sizes],
  );
  const edges: Edge[] = useMemo(
    () =>
      g.edges.map((e) => ({
        id: e.id,
        type: "smoothstep",
        source: e.source,
        target: e.target,
        sourceHandle: e.sourcePort,
        targetHandle: e.targetPort,
        label:
          e.label ??
          (
            {
              matched: "Matched",
              not_matched: "Not matched",
              success: "Success",
              error: "Error",
            } as Record<string, string>
          )[e.sourcePort],
        style: {
          stroke:
            e.sourcePort === "matched"
              ? "#FA5D19"
              : e.sourcePort === "success"
                ? "#16a34a"
                : e.sourcePort === "error"
                  ? "#ef4444"
                  : "#9ca3af",
          strokeWidth: 1.3,
        },
      })),
    [g.edges],
  );
  const valid = (c: Connection | Edge) => {
    const source = g.nodes.find((n) => n.id === c.source),
      target = g.nodes.find((n) => n.id === c.target);
    if (
      !source ||
      !target ||
      target.type === "trigger" ||
      source.id === target.id ||
      !workflowOutputPorts(source.type).includes(c.sourceHandle ?? "") ||
      g.edges.some((e) => e.source === c.source && e.sourcePort === c.sourceHandle)
    )
      return false;
    const pending = [target.id],
      seen = new Set<string>();
    while (pending.length) {
      const id = pending.pop()!;
      if (id === source.id) return false;
      if (seen.has(id)) continue;
      seen.add(id);
      g.edges.filter((e) => e.source === id).forEach((e) => pending.push(e.target));
    }
    return true;
  };
  return (
    <div className="relative h-full min-w-0 bg-[#FAFAFA]">
      <ReactFlow
        onInit={setFlow}
        nodes={nodes}
        edges={edges}
        nodeTypes={WORKFLOW_CUSTOM_NODE_TYPES}
        onNodeClick={(_, n) => onSelectNode(n.id)}
        onPaneClick={() => onSelectNode(null)}
        isValidConnection={valid}
        onNodesChange={(changes) => {
          const dimensions = changes.filter((c) => c.type === "dimensions" && c.dimensions);
          if (dimensions.length)
            setSizes((prev) => {
              const next = { ...prev };
              for (const c of dimensions) {
                if (c.type === "dimensions" && c.dimensions) next[c.id] = c.dimensions;
              }
              return next;
            });
          if (isReadOnly) return;
          const meaningful = changes.filter((c) => c.type !== "select" && c.type !== "dimensions");
          if (!meaningful.length) return;
          const next = applyNodeChanges(meaningful, nodes);
          const ids = new Set(next.map((n) => n.id));
          onChangeGraph({
            ...g,
            nodes: next.map((n) => ({
              ...g.nodes.find((v) => v.id === n.id)!,
              position: n.position,
            })),
            edges: g.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
          });
        }}
        onEdgesChange={(changes) => {
          if (isReadOnly) return;
          const removed = new Set(changes.filter((c) => c.type === "remove").map((c) => c.id));
          if (removed.size)
            onChangeGraph({ ...g, edges: g.edges.filter((e) => !removed.has(e.id)) });
        }}
        onConnect={(c) => {
          if (!isReadOnly && valid(c))
            onChangeGraph({
              ...g,
              edges: [
                ...g.edges,
                {
                  id: crypto.randomUUID(),
                  source: c.source!,
                  sourcePort: c.sourceHandle as any,
                  target: c.target!,
                  targetPort: "in",
                },
              ],
            });
        }}
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        deleteKeyCode={null}
        defaultViewport={g.viewport}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.55, maxZoom: 0.85 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E2E3E6" />
        <Controls className="!rounded-lg !border !border-neutral-200 !bg-white !shadow-sm" />
        <MiniMap
          nodeColor="#fed7aa"
          className="!h-24 !w-40 !rounded-lg !border !border-neutral-200 !shadow-sm"
        />
      </ReactFlow>
      {!isReadOnly && (
        <button
          onClick={onOpenActionCatalog}
          className="absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-[#FA5D19] px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add step
        </button>
      )}
    </div>
  );
}
