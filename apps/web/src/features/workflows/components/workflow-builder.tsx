"use client";

import { useState } from "react";
import { useWorkflowEditor } from "../hooks/use-workflow-editor";
import type { WorkflowDefinition,WorkflowRun } from "../lib/types";
import { AutomationChain } from "./automation-chain";
import { DiscardChangesDialog } from "./discard-changes-dialog";
import { ExecutionHistory } from "./execution-history";
import { StepInspector } from "./step-inspector";
import { WorkflowHeader } from "./workflow-header";

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

export function WorkflowBuilder({
  initialWorkflow,
  runs,
  runsBaseUrl,
  backUrl,
  builderUrl,
  isPreview = false,
  isNew = false,
  onSaveWorkflow,
}: WorkflowBuilderProps) {
  const {
    workflow,
    isDirty,
    selectedNodeId,
    pendingSelectionNodeId,
    setHasUnappliedInspectorChanges,
    requestNodeSelection,
    confirmDiscardAndSwitch,
    cancelSwitch,
    updateWorkflowMetadata,
    updateTrigger,
    updateConditionGroup,
    addCondition,
    removeCondition,
    addAction,
    updateAction,
    removeAction,
    reorderAction,
    markSaved,
  } = useWorkflowEditor({ initialWorkflow });

  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  async function handleSaveDraft() {
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      if (onSaveWorkflow) {
        await onSaveWorkflow(workflow);
      }
      markSaved(workflow);
      if (isPreview) {
        setFeedbackMessage("Draft saved in this preview. Not persisted.");
      } else {
        setFeedbackMessage("Draft changes committed to workspace session.");
      }
    } catch (err: unknown) {
      setFeedbackMessage((err instanceof Error ? err.message : null) || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (isPreview) {
      setFeedbackMessage("Activation is disabled in preview mode.");
      return;
    }
    if (!onSaveWorkflow) {
      setFeedbackMessage("Workflow activation requires connected backend execution engine.");
      return;
    }
    if (workflow.status !== "active" && workflow.actions.length === 0) {
      setFeedbackMessage("Add at least one action before activating.");
      return;
    }
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      const nextStatus = workflow.status === "active" ? "paused" : "active";
      const next = { ...workflow, status: nextStatus as typeof workflow.status };
      await onSaveWorkflow(next);
      markSaved(next);
      setFeedbackMessage(nextStatus === "active" ? "Workflow activated." : "Workflow paused.");
    } catch (err: unknown) {
      setFeedbackMessage((err instanceof Error ? err.message : null) || "Failed to update status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Workflow Header */}
      <WorkflowHeader
        workflow={workflow}
        isNew={isNew}
        isDirty={isDirty}
        isSaving={isSaving}
        isPreview={isPreview}
        activeTab="builder"
        backUrl={backUrl}
        runsUrl={runsBaseUrl}
        builderUrl={builderUrl}
        onSaveDraft={handleSaveDraft}
        onToggleActive={handleToggleActive}
        onUpdateMetadata={updateWorkflowMetadata}
      />

      {/* Ephemeral Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-8 border border-neutral-200 bg-neutral-100/90 px-4 py-2 text-xs text-accent-black flex items-center justify-between animate-in fade-in duration-100">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-neutral-400 hover:text-neutral-700 font-bold ml-3"
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      {/* Two-Column Editor Layout: Canvas (left) + Inspector (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="min-w-0 lg:col-span-7">
          <AutomationChain
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onSelectNode={requestNodeSelection}
            onAddCondition={addCondition}
            onRemoveCondition={removeCondition}
            onAddAction={addAction}
            onRemoveAction={removeAction}
            onReorderAction={reorderAction}
          />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <StepInspector
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onClose={() => requestNodeSelection(workflow.trigger.id)}
            onApplyTrigger={updateTrigger}
            onApplyCondition={updateConditionGroup}
            onApplyAction={updateAction}
            onRemoveCondition={removeCondition}
            onDirtyChange={setHasUnappliedInspectorChanges}
          />
        </div>
      </div>

      {/* Recent Executions Section */}
      <div className="pt-2">
        <ExecutionHistory
          runs={runs}
          runsBaseUrl={runsBaseUrl}
          isRecent={true}
          initialSelectedRunId={runs.length > 1 ? runs[1].id : null}
        />
      </div>

      {/* Discard Changes Confirmation Dialog */}
      <DiscardChangesDialog
        open={Boolean(pendingSelectionNodeId)}
        onConfirm={confirmDiscardAndSwitch}
        onCancel={cancelSwitch}
      />
    </div>
  );
}
