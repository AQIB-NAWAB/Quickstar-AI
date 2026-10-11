"use client";

import { ArrowDown,Focus,Plus } from "lucide-react";
import React,{ useRef,useState } from "react";
import type { WorkflowAction,WorkflowDefinition } from "../lib/types";
import { ActionPicker } from "./action-picker";
import { WorkflowNode } from "./workflow-node";

interface AutomationChainProps {
  workflow: WorkflowDefinition;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: () => void;
  onAddAction: (action: WorkflowAction, targetIndex?: number) => void;
  onRemoveAction: (actionId: string) => void;
  onReorderAction: (actionId: string, direction: "up" | "down") => void;
}

export function AutomationChain({
  workflow,
  selectedNodeId,
  onSelectNode,
  onAddCondition,
  onRemoveCondition,
  onAddAction,
  onRemoveAction,
  onReorderAction,
}: AutomationChainProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetActionIndex, setTargetActionIndex] = useState<number | undefined>(undefined);
  const chainContainerRef = useRef<HTMLDivElement>(null);

  function handleOpenPicker(index?: number) {
    setTargetActionIndex(index);
    setPickerOpen(true);
  }

  function handleSelectAction(newAction: WorkflowAction) {
    onAddAction(newAction, targetActionIndex);
    setPickerOpen(false);
  }

  function handleFitView() {
    if (chainContainerRef.current) {
      const selectedEl = chainContainerRef.current.querySelector('[aria-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        chainContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  // Calculate step numbering
  const hasCondition = Boolean(workflow.conditionGroup);

  return (
    <div className="bg-white border border-border-faint rounded-12 min-w-0 p-4 flex flex-col relative shadow-xs">
      {/* Canvas Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-faint/80">
        <div>
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            Automation chain
          </h3>
          <p className="text-[11px] text-neutral-400">
            Steps run in order.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFitView}
          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-6 transition-colors"
          title="Fit view / focus selected node"
          aria-label="Fit view"
        >
          <Focus className="w-4 h-4" />
        </button>
      </div>

      {/* Dotted Canvas Area */}
      <div
        ref={chainContainerRef}
        className="mt-3 relative min-h-[430px] max-h-[560px] overflow-y-auto rounded-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-neutral-50/40 p-4 sm:p-4 flex flex-col items-center border border-neutral-100"
      >
        {/* Step 1: Trigger */}
        <div className="flex flex-col items-center">
          <WorkflowNode
            id={workflow.trigger.id}
            kind="trigger"
            stepNumber={1}
            isSelected={selectedNodeId === workflow.trigger.id}
            onSelect={() => onSelectNode(workflow.trigger.id)}
            trigger={workflow.trigger}
          />
        </div>

        {/* Connector from Trigger */}
        <div className="flex flex-col items-center my-1 relative">
          <div className="w-px h-4 bg-neutral-300" />
          <button
            type="button"
            onClick={() => {
              if (!hasCondition) {
                // If no condition, prompt or add condition directly
                onAddCondition();
              } else {
                handleOpenPicker(0);
              }
            }}
            className="w-5 h-5 rounded-full border border-neutral-300 bg-white hover:border-heat-100 hover:bg-orange-50 text-neutral-400 hover:text-heat-100 flex items-center justify-center transition-all -my-2.5 z-10 shadow-xs"
            title={!hasCondition ? "Add condition step" : "Insert action before steps"}
            aria-label={!hasCondition ? "Add condition" : "Insert action"}
          >
            <Plus className="w-3 h-3" />
          </button>
          <div className="w-px h-4 bg-neutral-300" />
          <ArrowDown className="w-3.5 h-3.5 text-neutral-400 -mt-1.5" />
        </div>

        {/* Step 2: Condition (if present) */}
        {hasCondition && workflow.conditionGroup && (
          <>
            <div className="flex flex-col items-center">
              <WorkflowNode
                id={workflow.conditionGroup.id}
                kind="condition"
                stepNumber={2}
                isSelected={selectedNodeId === workflow.conditionGroup.id}
                onSelect={() => onSelectNode(workflow.conditionGroup!.id)}
                conditionGroup={workflow.conditionGroup}
                onDelete={onRemoveCondition}
              />
            </div>

            {/* Connector after Condition */}
            <div className="flex flex-col items-center my-1 relative">
              <div className="w-px h-4 bg-neutral-300" />
              <button
                type="button"
                onClick={() => handleOpenPicker(0)}
                className="w-5 h-5 rounded-full border border-neutral-300 bg-white hover:border-heat-100 hover:bg-orange-50 text-neutral-400 hover:text-heat-100 flex items-center justify-center transition-all -my-2.5 z-10 shadow-xs"
                title="Insert action"
                aria-label="Insert action"
              >
                <Plus className="w-3 h-3" />
              </button>
              <div className="w-px h-4 bg-neutral-300" />
              <ArrowDown className="w-3.5 h-3.5 text-neutral-400 -mt-1.5" />
            </div>
          </>
        )}

        {/* Ordered Actions */}
        {workflow.actions.map((act, idx) => {
          const actionStepNumber = (hasCondition ? 2 : 1) + idx + 1;
          const isLastAction = idx === workflow.actions.length - 1;

          return (
            <React.Fragment key={act.id}>
              <div className="flex flex-col items-center">
                <WorkflowNode
                  id={act.id}
                  kind="action"
                  stepNumber={actionStepNumber}
                  isSelected={selectedNodeId === act.id}
                  onSelect={() => onSelectNode(act.id)}
                  action={act}
                  canMoveUp={idx > 0}
                  canMoveDown={!isLastAction}
                  onMoveUp={() => onReorderAction(act.id, "up")}
                  onMoveDown={() => onReorderAction(act.id, "down")}
                  onDelete={() => onRemoveAction(act.id)}
                />
              </div>

              {/* Connector between actions */}
              <div className="flex flex-col items-center my-1 relative">
                <div className="w-px h-4 bg-neutral-300" />
                <button
                  type="button"
                  onClick={() => handleOpenPicker(idx + 1)}
                  className="w-5 h-5 rounded-full border border-neutral-300 bg-white hover:border-heat-100 hover:bg-orange-50 text-neutral-400 hover:text-heat-100 flex items-center justify-center transition-all -my-2.5 z-10 shadow-xs"
                  title="Insert action here"
                  aria-label="Insert action here"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <div className="w-px h-4 bg-neutral-300" />
                <ArrowDown className="w-3.5 h-3.5 text-neutral-400 -mt-1.5" />
              </div>
            </React.Fragment>
          );
        })}

        {/* Final Add Action dashed button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => handleOpenPicker()}
            className="w-full max-w-[280px] rounded-12 border-2 border-dashed border-neutral-200 hover:border-heat-100 bg-white/70 hover:bg-orange-50/20 py-2.5 px-4 text-xs font-semibold text-neutral-600 hover:text-heat-100 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add action</span>
          </button>
        </div>

        {/* Bottom Legend */}
        <div className="w-full mt-6 pt-3 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none">
          <span>Trigger &rarr; Condition &rarr; Action</span>
          {!hasCondition && (
            <button
              type="button"
              onClick={onAddCondition}
              className="text-heat-100 hover:underline font-sans text-xs"
            >
              + Add condition group
            </button>
          )}
        </div>
      </div>

      {/* Action Picker Dialog */}
      <ActionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectAction={handleSelectAction}
      />
    </div>
  );
}
