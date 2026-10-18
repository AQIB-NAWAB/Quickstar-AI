import type { Node, Edge } from "@xyflow/react";
import type {
  AgentGraph,
  AgentGraphEdge,
  AgentGraphNode,
  GraphNodeType,
  GraphSessionState,
  GraphTraceEvent,
  GraphExecutionTrace,
  GraphValidationIssue,
  NodeConfigMap,
} from "@quickstart/contracts";

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

export type CanvasEditorContextType = {
  workspaceId: string;
  agentId: string;
  agentName: string;
  draftRevision: number;
  publishedReleaseNumber: number | null;
  saveState: CanvasSaveState;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  validationIssues: GraphValidationIssue[];
  previewSessionId: string | null;
  activeTrace: GraphExecutionTrace | null;
  isWorkbenchOpen: boolean;
  workbenchTab: WorkbenchTab;
  inspectorTab: InspectorTab;
  isLibraryOpen: boolean;
};
