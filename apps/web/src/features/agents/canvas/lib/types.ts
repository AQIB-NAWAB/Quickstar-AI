import type { Node, Edge } from "@xyflow/react";
import type { GraphNodeType, NodeConfigMap } from "@quickstart/contracts";

export type CanvasSaveState = "saved" | "saving" | "unsaved" | "error" | "conflict";

export type CanvasNodeData<T extends GraphNodeType = GraphNodeType> = {
  type: T;
  label: string;
  config: NodeConfigMap[T];
  presentation?: Record<string, unknown>;
  hasErrors?: boolean;
  errorMessage?: string;
  isExecuting?: boolean;
  executionStatus?: "running" | "succeeded" | "failed" | "waiting";
  onSelect?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onAddBranch?: () => void;
  onDeleteBranch?: (branchId: string) => void;
};

export type CanvasFlowNode = Node<CanvasNodeData>;
export type CanvasFlowEdge = Edge<{
  label?: string;
  conditionDescription?: string;
  isExecuting?: boolean;
}>;

export type WorkbenchTab = "chat" | "voice";
export type InspectorTab = "node" | "agent";
