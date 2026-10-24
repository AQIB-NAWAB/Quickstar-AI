"use client";

import { useState } from "react";
import type {
ConditionGroup,
WorkflowAction,
WorkflowDefinition,
WorkflowTrigger,
} from "../lib/types";

export interface UseWorkflowEditorProps {
  initialWorkflow: WorkflowDefinition;
}

export function useWorkflowEditor({ initialWorkflow }: UseWorkflowEditorProps) {
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(initialWorkflow);
  const [baseline, setBaseline] = useState<WorkflowDefinition>(initialWorkflow);

  // Default selection to first action if present, otherwise trigger
  const defaultSelection =
    initialWorkflow.actions.length > 0
      ? initialWorkflow.actions[0].id
      : initialWorkflow.trigger.id;

  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultSelection);
  const [hasUnappliedInspectorChanges, setHasUnappliedInspectorChanges] = useState(false);
  const [pendingSelectionNodeId, setPendingSelectionNodeId] = useState<string | null>(null);

  // Workflow dirty state
  const isDirty =
    JSON.stringify(workflow) !== JSON.stringify(baseline) ||
    hasUnappliedInspectorChanges;

  function updateWorkflowMetadata(name: string, description: string | null) {
    setWorkflow((prev) => ({
      ...prev,
      name,
      description,
    }));
  }

  function updateTrigger(trigger: WorkflowTrigger) {
    setWorkflow((prev) => ({
      ...prev,
      trigger,
    }));
    setHasUnappliedInspectorChanges(false);
  }

  function updateConditionGroup(group: ConditionGroup | null) {
    setWorkflow((prev) => ({
      ...prev,
      conditionGroup: group,
    }));
    setHasUnappliedInspectorChanges(false);
  }

  function addCondition() {
    const newGroup: ConditionGroup = {
      id: `condition-${Date.now()}`,
      logic: "and",
      rules: [
        {
          id: `rule-${Date.now()}`,
          field: "message.text",
          operator: "contains",
          value: "",
        },
      ],
    };
    setWorkflow((prev) => ({
      ...prev,
      conditionGroup: newGroup,
    }));
    setSelectedNodeId(newGroup.id);
  }

  function removeCondition() {
    setWorkflow((prev) => ({
      ...prev,
      conditionGroup: null,
    }));
    if (workflow.conditionGroup && selectedNodeId === workflow.conditionGroup.id) {
      setSelectedNodeId(workflow.trigger.id);
    }
  }

  function addAction(newAction: WorkflowAction, targetIndex?: number) {
    setWorkflow((prev) => {
      const copy = [...prev.actions];
      if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= copy.length) {
        copy.splice(targetIndex, 0, newAction);
      } else {
        copy.push(newAction);
      }
      return { ...prev, actions: copy };
    });
    setSelectedNodeId(newAction.id);
    setHasUnappliedInspectorChanges(false);
  }

  function updateAction(updatedAction: WorkflowAction) {
    setWorkflow((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === updatedAction.id ? updatedAction : a)),
    }));
    setHasUnappliedInspectorChanges(false);
  }

  function removeAction(actionId: string) {
    setWorkflow((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== actionId),
    }));
    if (selectedNodeId === actionId) {
      setSelectedNodeId(workflow.trigger.id);
    }
    setHasUnappliedInspectorChanges(false);
  }

  function reorderAction(actionId: string, direction: "up" | "down") {
    setWorkflow((prev) => {
      const idx = prev.actions.findIndex((a) => a.id === actionId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.actions.length) return prev;

      const copy = [...prev.actions];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return { ...prev, actions: copy };
    });
  }

  function requestNodeSelection(nodeId: string) {
    if (nodeId === selectedNodeId) return;
    if (hasUnappliedInspectorChanges) {
      setPendingSelectionNodeId(nodeId);
      return;
    }
    setSelectedNodeId(nodeId);
  }

  function confirmDiscardAndSwitch() {
    if (pendingSelectionNodeId) {
      setSelectedNodeId(pendingSelectionNodeId);
      setPendingSelectionNodeId(null);
      setHasUnappliedInspectorChanges(false);
    }
  }

  function cancelSwitch() {
    setPendingSelectionNodeId(null);
  }

  function markSaved(savedWf: WorkflowDefinition) {
    setWorkflow(savedWf);
    setBaseline(savedWf);
    setHasUnappliedInspectorChanges(false);
  }

  return {
    workflow,
    isDirty,
    selectedNodeId,
    hasUnappliedInspectorChanges,
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
  };
}
