"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Play,
  Save,
  ShieldCheck,
  Zap,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronRight,
  Plus,
} from "lucide-react";
import type {
  WorkflowDefinition,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowRun,
  WorkflowSettings,
  WorkflowValidationResult,
  WorkflowSimulationResult,
} from "../lib/types";
import { WorkflowStatusBadge } from "./workflow-status-badge";
import { WorkflowCanvas } from "./canvas/workflow-canvas";
import { TriggerInspector } from "./inspectors/trigger-inspector";
import { ConditionInspector } from "./inspectors/condition-inspector";
import { HttpInspector } from "./inspectors/http-inspector";
import { HandoffInspector } from "./inspectors/handoff-inspector";
import { NotificationInspector } from "./inspectors/notification-inspector";
import { ActionCatalogDialog } from "./dialogs/action-catalog-dialog";
import { VariablePickerDialog } from "./dialogs/variable-picker-dialog";
import { WorkflowSettingsDialog } from "./dialogs/workflow-settings-dialog";
import { ReviewActivateDialog } from "./dialogs/review-activate-dialog";
import { TestWorkbench } from "./workbench/test-workbench";
import { ExecutionHistory } from "./execution-history";
import {
  saveWorkflowDraftApi,
  activateWorkflowApi,
  pauseWorkflowApi,
  validateWorkflowApi,
  simulateWorkflowApi,
} from "../lib/client";

interface WorkflowBuilderProps {
  initialWorkflow: WorkflowDefinition;
  runs: WorkflowRun[];
  runsBaseUrl: string;
  backUrl: string;
  builderUrl: string;
  isPreview?: boolean;
  isNew?: boolean;
  onSaveWorkflow?: (workflow: WorkflowDefinition) => Promise<void> | void;
}

function initialGraphFor(workflow: WorkflowDefinition): WorkflowGraph {
  if (workflow.draft_graph) return workflow.draft_graph;
  const nodes: WorkflowNode[] = [
    {
      id: "trigger",
      type: "trigger",
      name: "Message received",
      position: { x: 220, y: 140 },
      config: {
        trigger_type: "app_event",
        event_type: workflow.trigger.eventType,
        run_for: "visitor_messages",
        agent_scope: "all",
        channel_scope: "all",
        ignore_workflow_generated: true,
        deduplicate_events: true,
      },
    },
  ];
  const edges: WorkflowGraph["edges"] = [];
  let source = "trigger",
    port = "received";
  if (workflow.conditionGroup) {
    nodes.push({
      id: "condition",
      type: "condition",
      name: "Match conditions",
      position: { x: 520, y: 140 },
      config: { root_group: workflow.conditionGroup },
    });
    edges.push({
      id: "trigger-condition",
      source,
      sourcePort: "received",
      target: "condition",
      targetPort: "in",
    });
    source = "condition";
    port = "matched";
  }
  for (const [i, action] of workflow.actions.entries()) {
    const type = action.kind === "email_notification" ? "notification" : action.kind;
    nodes.push({
      id: action.id,
      type: type as WorkflowNodeType,
      name: action.displayName,
      position: { x: 520 + (i % 2) * 300, y: 340 + Math.floor(i / 2) * 190 },
      config: action.config as any,
    });
    edges.push({
      id: `edge-${action.id}`,
      source,
      sourcePort: port as any,
      target: action.id,
      targetPort: "in",
    });
    source = action.id;
    port = "success";
  }
  nodes.push({
    id: "end",
    type: "end",
    name: "End workflow",
    position: { x: 820, y: 140 },
    config: { reason: "completed" },
  });
  edges.push({ id: "final", source, sourcePort: port as any, target: "end", targetPort: "in" });
  if (workflow.conditionGroup)
    edges.push({
      id: "unmatched",
      source: "condition",
      sourcePort: "not_matched",
      target: "end",
      targetPort: "in",
    });
  return {
    schema_version: 1,
    entry_node_id: "trigger",
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 0.85 },
  };
}

const DEFAULT_SETTINGS: WorkflowSettings = {
  timezone: "UTC",
  max_run_duration_seconds: 60,
  concurrent_runs: 5,
  deduplicate_incoming: true,
  prevent_recursive: true,
  default_failure_handling: "follow_error_path",
  retry_policy: {
    strategy: "exponential_backoff",
    max_attempts: 1,
    retry_transient_only: true,
  },
  failure_notifications: {
    enabled: false,
    recipients: [],
    channels: ["email"],
  },
};

export function WorkflowBuilder({
  initialWorkflow,
  runs,
  runsBaseUrl,
  backUrl,
  builderUrl,
  isPreview = false,
  isNew = false,
}: WorkflowBuilderProps) {
  // Workflow state
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(initialWorkflow);
  const [currentGraph, setCurrentGraph] = useState<WorkflowGraph>(initialGraphFor(initialWorkflow));
  const [settings, setSettings] = useState<WorkflowSettings>(
    initialWorkflow.settings || DEFAULT_SETTINGS,
  );
  const [isDirty, setIsDirty] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Active view tab in header: Canvas builder vs Execution history
  const [activeTab, setActiveTab] = useState<"builder" | "runs">("builder");

  // Selection & Inspector states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showActionCatalog, setShowActionCatalog] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [variableCallback, setVariableCallback] = useState<((path: string) => void) | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showReviewActivate, setShowReviewActivate] = useState(false);
  const [showOutline, setShowOutline] = useState(true);

  // Simulation & Validation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastSimulation, setLastSimulation] = useState<WorkflowSimulationResult | null>(null);
  const [validation, setValidation] = useState<WorkflowValidationResult>({
    valid: false,
    blockers: [],
    warnings: [],
    summary: "Validation pending",
    checked_at: new Date().toISOString(),
    revision: workflow.draft_revision || 1,
  });

  const validationSequence = useRef(0);
  const editSequence = useRef(0);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  // Selected node object
  const selectedNode = useMemo(
    () => currentGraph.nodes.find((n) => n.id === selectedNodeId) || null,
    [currentGraph, selectedNodeId],
  );

  // Validate graph on changes
  const runGraphValidation = useCallback(
    async (graphToValidate: WorkflowGraph) => {
      const sequence = ++validationSequence.current;
      const res = await validateWorkflowApi(workflow.workspaceId, workflow.id, graphToValidate);
      if (res.status === "ready" && sequence === validationSequence.current) {
        setValidation(res.data);
      } else if(sequence===validationSequence.current){setValidation(v=>({...v,valid:false,summary:"Validation unavailable. Retry before activation."}));}
    },
    [workflow.workspaceId, workflow.id],
  );

  // Handle graph mutation from canvas
  const handleGraphChange = useCallback(
    (nextGraph: WorkflowGraph) => {
      editSequence.current++;
      setLastSimulation(null);
      setCurrentGraph(nextGraph);
      setIsDirty(true);
    },
    [runGraphValidation],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void runGraphValidation(currentGraph).catch(() =>
        setValidation((v) => ({ ...v, valid: false, summary: "Validation unavailable" })),
      );
    }, 450);
    return () => clearTimeout(timer);
  }, [currentGraph, runGraphValidation]);
  // Node config updates from inspectors
  const handleUpdateNodeConfig = useCallback(
    (config: Record<string, any>) => {
      if (!selectedNodeId) return;
      const updatedNodes = currentGraph.nodes.map((node) =>
        node.id === selectedNodeId ? { ...node, config } : node,
      );
      const nextGraph = { ...currentGraph, nodes: updatedNodes };
      handleGraphChange(nextGraph);
    },
    [currentGraph, handleGraphChange, selectedNodeId],
  );

  // Node name update from inspectors
  const handleUpdateNodeName = useCallback(
    (name: string) => {
      if (!selectedNodeId) return;
      const updatedNodes = currentGraph.nodes.map((node) =>
        node.id === selectedNodeId ? { ...node, name } : node,
      );
      const nextGraph = { ...currentGraph, nodes: updatedNodes };
      handleGraphChange(nextGraph);
    },
    [currentGraph, handleGraphChange, selectedNodeId],
  );

  // Add step from Action Catalog
  const handleAddActionNode = useCallback(
    (type: WorkflowNodeType, metadata: { name: string; config: Record<string, any> }) => {
      const newNodeId = crypto.randomUUID();
      const lastNode = currentGraph.nodes[currentGraph.nodes.length - 1];
      const newPos = lastNode
        ? { x: lastNode.position.x + 300, y: lastNode.position.y }
        : { x: 300, y: 200 };

      const newNode: WorkflowNode = {
        id: newNodeId,
        type,
        name: metadata.name,
        position: newPos,
        config: metadata.config,
      };

      const nextNodes = [...currentGraph.nodes, newNode];
      const source = currentGraph.nodes.find((n) => n.id === selectedNodeId);
      const edge = source ? currentGraph.edges.find((e) => e.source === source.id) : undefined;
      if (type === "end" && edge) {
        setBannerMessage({
          type: "error",
          text: "End steps cannot be inserted before an existing successor. Add it unconnected and choose its incoming route explicitly.",
        });
        return;
      }
      const canContinue = type !== "end";
      const edges = edge
        ? [
            ...currentGraph.edges.filter((e) => e.id !== edge.id),
            { ...edge, id: crypto.randomUUID(), target: newNodeId },
            ...(canContinue
              ? [
                  {
                    id: crypto.randomUUID(),
                    source: newNodeId,
                    sourcePort:
                      type === "condition"
                        ? ("matched" as const)
                        : type === "log"
                          ? ("next" as const)
                          : ("success" as const),
                    target: edge.target,
                    targetPort: "in" as const,
                  },
                ]
              : []),
          ]
        : currentGraph.edges;
      const nextGraph = { ...currentGraph, nodes: nextNodes, edges };
      handleGraphChange(nextGraph);
      setSelectedNodeId(newNodeId);
    },
    [currentGraph, handleGraphChange, selectedNodeId],
  );

  // Open Variable Picker with callback
  const handleOpenVariablePicker = (callback: (path: string) => void) => {
    setVariableCallback(() => callback);
    setShowVariablePicker(true);
  };

  const handleInsertVariable = (path: string) => {
    if (variableCallback) {
      variableCallback(path);
    }
  };

  // Save Draft API
  const handleSaveDraft = async () => {
    if (isSaving) return;
    const sequence = editSequence.current;
    setIsSaving(true);
    setBannerMessage(null);
    try {
      const res = await saveWorkflowDraftApi(workflow.workspaceId, workflow.id, {
        graph: currentGraph,
        settings,
        expectedRevision: workflow.draft_revision || 1,
        name: workflow.name,
        description: workflow.description,
      });

      if (res.status === "ready") {
        setWorkflow(previous=>editSequence.current===sequence?res.data:{...res.data,name:previous.name,description:previous.description});
        setIsDirty(editSequence.current !== sequence);
        setBannerMessage({ type: "success", text: "Draft saved." });
      } else {
        setBannerMessage({ type: "error", text: res.message || "Failed to save draft." });
      }
    } catch (err: unknown) {
      setBannerMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving draft",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Run Dry-Run Simulation Test
  const handleRunSimulation = async (
    samplePayload?: Record<string, unknown>,
  ): Promise<WorkflowSimulationResult> => {
    const sequence=editSequence.current;
    setIsSimulating(true);
    try {
      const res = await simulateWorkflowApi(workflow.workspaceId, workflow.id, {
        graph: currentGraph,
        samplePayload,
      });
      if (res.status === "ready") {
        if(sequence===editSequence.current)setLastSimulation(res.data);
        return res.data;
      }
      throw new Error(res.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // Activate Workflow API
  const handleActivate = async (changelog?: string) => {
    if (isDirty || isSaving) throw new Error("Save the current draft before activation.");
    const res = await activateWorkflowApi(workflow.workspaceId, workflow.id, {
      changelog,
      expectedRevision: workflow.draft_revision || 1,
    });
    if (res.status === "ready") {
      setWorkflow(res.data.workflow);
      setIsDirty(false);
      setBannerMessage({
        type: "success",
        text: `Version v${res.data.versionNumber} activated and published live.`,
      });
    } else {
      throw new Error(res.message);
    }
  };

  // Pause Workflow API
  const handlePause = async () => {
    const res = await pauseWorkflowApi(workflow.workspaceId, workflow.id);
    if (res.status === "ready") {
      setWorkflow(res.data);
      setBannerMessage({ type: "success", text: "Workflow paused. Events will not trigger runs." });
    }else{setBannerMessage({type:"error",text:res.message});}
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-[600px] overflow-hidden bg-white select-none">
      <header className="shrink-0 border-b border-neutral-200 bg-white px-6 pt-4">
        <div className="mb-2 text-xs text-neutral-500">
          <Link href={backUrl}>Workflows</Link>
          <span className="mx-2">/</span>
          {workflow.name}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <input
              aria-label="Workflow name"
              value={workflow.name}
              onChange={(e) => {
                editSequence.current++;
                setWorkflow({ ...workflow, name: e.target.value });
                setIsDirty(true);
              }}
              className="min-w-0 max-w-sm rounded border border-transparent bg-transparent text-xl font-semibold focus:border-[#FA5D19] focus:outline-none"
            />
            <WorkflowStatusBadge status={workflow.status} />
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
              {workflow.active_version_number
                ? `v${workflow.active_version_number}`
                : `rev ${workflow.draft_revision ?? 1}`}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            <span className="mr-2 text-neutral-500">
              {isSaving ? "Saving…" : isDirty ? "● Unsaved changes" : "✓ All changes saved"}
            </span>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="rounded-lg border px-3 py-2 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              onClick={() => setShowWorkbench(!showWorkbench)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <Play className="h-3.5 w-3.5" />
              Test workflow
            </button>
            {workflow.status === "active" ? (
              <button
                onClick={() => void handlePause()}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-white"
              >
                Pause
              </button>
            ) : (
              <button
                disabled={isDirty || isSaving}
                onClick={async () => {
                  await runGraphValidation(currentGraph);
                  setShowReviewActivate(true);
                }}
                className="rounded-lg bg-[#FA5D19] px-4 py-2 text-white disabled:opacity-40"
                title={isDirty ? "Save draft before activation" : undefined}
              >
                Review and activate
              </button>
            )}
          </div>
        </div>
        <nav className="mt-3 flex gap-6 text-xs">
          <button
            className={`border-b-2 py-3 ${activeTab === "builder" && !showSettings ? "border-[#FA5D19] text-[#FA5D19]" : "border-transparent"}`}
            onClick={() => {
              setActiveTab("builder");
              setShowSettings(false);
            }}
          >
            Builder
          </button>
          <button
            className={`border-b-2 py-3 ${activeTab === "runs" ? "border-[#FA5D19] text-[#FA5D19]" : "border-transparent"}`}
            onClick={() => setActiveTab("runs")}
          >
            Execution history{" "}
            <span className="ml-1 rounded bg-neutral-100 px-1.5">{runs.length}</span>
          </button>
          <button
            className={`border-b-2 py-3 ${showSettings ? "border-[#FA5D19] text-[#FA5D19]" : "border-transparent"}`}
            onClick={() => setShowSettings(true)}
          >
            Settings
          </button>
          <button className="ml-auto text-neutral-500" onClick={() => setShowOutline(!showOutline)}>
            Toggle outline
          </button>
        </nav>
      </header>

      {/* Banner Notice */}
      {bannerMessage && (
        <div
          className={`px-5 py-2 text-xs flex items-center justify-between transition-colors ${
            bannerMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
              : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-neutral-400 hover:text-neutral-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {showSettings ? (
          <WorkflowSettingsDialog
            inline
            isOpen
            settings={settings}
            workflowName={workflow.name}
            description={workflow.description}
            onMetadataChange={(name, description) => {
              editSequence.current++;
              setWorkflow({ ...workflow, name, description });
              setIsDirty(true);
            }}
            onSave={(updated) => {
              editSequence.current++;
              setSettings(updated);
              setIsDirty(true);
            }}
            onClose={() => setShowSettings(false)}
          />
        ) : activeTab === "builder" ? (
          <>
            {/* Optional Left Steps Outline Drawer */}
            {showOutline && (
              <div className="w-44 border-r border-neutral-200 bg-white flex flex-col shrink-0 z-20">
                <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Steps Outline ({currentGraph.nodes.length})
                  </span>
                  <button onClick={() => setShowOutline(false)}>
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {currentGraph.nodes.map((node, idx) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        selectedNodeId === node.id
                          ? "bg-orange-50 border-[#FA5D19] text-neutral-900 font-semibold"
                          : "border-transparent hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono font-bold text-neutral-400">
                          {idx + 1}.
                        </span>
                        <span className="truncate">{node.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Graph Canvas */}
            <div className="flex-1 min-w-0 relative h-full">
              <WorkflowCanvas
                initialGraph={currentGraph}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onChangeGraph={handleGraphChange}
                onOpenActionCatalog={() => setShowActionCatalog(true)}
              />

              {/* Bottom Test Workbench Drawer */}
              <TestWorkbench
                isOpen={showWorkbench}
                onClose={() => setShowWorkbench(false)}
                isRunning={isSimulating}
                simulationResult={lastSimulation}
                onRunTest={async (payload) => {
                  await handleRunSimulation(payload);
                }}
              />
            </div>

            {/* Slide-out Right Inspector */}
            {showActionCatalog ? (
              <ActionCatalogDialog
                isOpen
                onClose={() => setShowActionCatalog(false)}
                onSelectAction={handleAddActionNode}
                context={
                  selectedNode
                    ? `After ${selectedNode.name} · ${currentGraph.edges.find((e) => e.source === selectedNode.id)?.sourcePort ?? "Unconnected"} path`
                    : "Choose a step, then connect it on the canvas"
                }
              />
            ) : (
              selectedNode && (
                <div className="h-full z-30 shrink-0 border-l border-neutral-200">
                  {selectedNode.type === "trigger" && (
                    <TriggerInspector
                      node={selectedNode}
                      onUpdateConfig={handleUpdateNodeConfig}
                      onUpdateName={handleUpdateNodeName}
                      onClose={() => setSelectedNodeId(null)}
                      onTestStep={() => setShowWorkbench(true)}
                    />
                  )}
                  {selectedNode.type === "condition" && (
                    <ConditionInspector
                      graph={currentGraph}
                      onRoute={(port, target) => {
                        handleGraphChange({
                          ...currentGraph,
                          edges: [
                            ...currentGraph.edges.filter(
                              (e) => !(e.source === selectedNode.id && e.sourcePort === port),
                            ),
                            ...(target
                              ? [
                                  {
                                    id: crypto.randomUUID(),
                                    source: selectedNode.id,
                                    sourcePort: port,
                                    target,
                                    targetPort: "in" as const,
                                  },
                                ]
                              : []),
                          ],
                        });
                      }}
                      node={selectedNode}
                      onUpdateConfig={handleUpdateNodeConfig}
                      onUpdateName={handleUpdateNodeName}
                      onClose={() => setSelectedNodeId(null)}
                      onOpenVariablePicker={handleOpenVariablePicker}
                    />
                  )}
                  {selectedNode.type === "webhook" && (
                    <HttpInspector
                      node={selectedNode}
                      onUpdateConfig={handleUpdateNodeConfig}
                      onUpdateName={handleUpdateNodeName}
                      onClose={() => setSelectedNodeId(null)}
                      onOpenVariablePicker={handleOpenVariablePicker}
                      onTestStep={() => setShowWorkbench(true)}
                    />
                  )}
                  {selectedNode.type === "agent_handoff" && (
                    <HandoffInspector
                      node={selectedNode}
                      onUpdateConfig={handleUpdateNodeConfig}
                      onUpdateName={handleUpdateNodeName}
                      onClose={() => setSelectedNodeId(null)}
                      onOpenVariablePicker={handleOpenVariablePicker}
                      onTestStep={() => setShowWorkbench(true)}
                    />
                  )}
                  {selectedNode.type === "notification" && (
                    <NotificationInspector
                      node={selectedNode}
                      onUpdateConfig={handleUpdateNodeConfig}
                      onUpdateName={handleUpdateNodeName}
                      onClose={() => setSelectedNodeId(null)}
                      onOpenVariablePicker={handleOpenVariablePicker}
                      onTestStep={() => setShowWorkbench(true)}
                    />
                  )}
                  {(selectedNode.type === "update_tags" ||
                    selectedNode.type === "log" ||
                    selectedNode.type === "end") && (
                    <div className="w-[380px] h-full bg-white border-l border-neutral-200 p-5 space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b pb-3">
                        <span className="font-bold text-sm text-neutral-900">
                          {selectedNode.name}
                        </span>
                        <button onClick={() => setSelectedNodeId(null)}>×</button>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-neutral-700">Step Name</label>
                        <input
                          type="text"
                          value={selectedNode.name}
                          onChange={(e) => handleUpdateNodeName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </>
        ) : (
          /* Execution History View Tab (matches Design Ref 3) */
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/40">
            <div className="max-w-6xl mx-auto space-y-4">
              <ExecutionHistory runs={runs} runsBaseUrl={runsBaseUrl} />
            </div>
          </div>
        )}
      </div>

      {/* Variable Picker Modal (Design Ref 10) */}
      <VariablePickerDialog
        isOpen={showVariablePicker}
        onClose={() => setShowVariablePicker(false)}
        onSelectVariable={handleInsertVariable}
      />

      {/* Review & Activate Dialog (Design Ref 12) */}
      <ReviewActivateDialog
        isOpen={showReviewActivate}
        onClose={() => setShowReviewActivate(false)}
        workflowName={workflow.name}
        currentRevision={workflow.draft_revision || 1}
        activeVersionNumber={workflow.active_version_number ?? null}
        validation={validation}
        lastSimulation={lastSimulation}
        onRunSimulation={handleRunSimulation}
        onActivate={handleActivate}
      />
    </div>
  );
}
