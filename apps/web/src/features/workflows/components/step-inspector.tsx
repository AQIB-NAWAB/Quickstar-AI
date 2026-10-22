"use client";

import type { WebhookActionConfig, UpdateTagsActionConfig, EmailActionConfig, HandoffActionConfig } from "../lib/types";

import {
Filter,
Globe,
Mail,
Tag,
UserRound,
X,
Zap,
} from "lucide-react";
import { useEffect,useState } from "react";
import type {
ActionKind,
ConditionGroup,
WorkflowAction,
WorkflowDefinition,
WorkflowTrigger,
} from "../lib/types";
import { EmailActionForm } from "./actions/email-action-form";
import { HandoffActionForm } from "./actions/handoff-action-form";
import { TagActionForm } from "./actions/tag-action-form";
import { WebhookActionForm } from "./actions/webhook-action-form";
import { ConditionForm } from "./condition-form";
import { TriggerForm } from "./trigger-form";

interface StepInspectorProps {
  workflow: WorkflowDefinition;
  selectedNodeId: string;
  onClose: () => void;
  onApplyTrigger: (trigger: WorkflowTrigger) => void;
  onApplyCondition: (condition: ConditionGroup | null) => void;
  onApplyAction: (action: WorkflowAction) => void;
  onRemoveCondition: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function StepInspector({
  workflow,
  selectedNodeId,
  onClose,
  onApplyTrigger,
  onApplyCondition,
  onApplyAction,
  onRemoveCondition,
  onDirtyChange,
}: StepInspectorProps) {
  // Determine selected node kind
  const isTrigger = workflow.trigger.id === selectedNodeId;
  const isCondition = workflow.conditionGroup?.id === selectedNodeId;
  const targetAction = workflow.actions.find((a) => a.id === selectedNodeId);

  // Local inspector drafts
  const [triggerDraft, setTriggerDraft] = useState<WorkflowTrigger>(workflow.trigger);
  const [conditionDraft, setConditionDraft] = useState<ConditionGroup | null>(
    workflow.conditionGroup ?? null,
  );
  const [actionDraft, setActionDraft] = useState<WorkflowAction | null>(
    targetAction ?? null,
  );

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isTrigger) {
      setTriggerDraft(workflow.trigger);
    } else if (isCondition) {
      setConditionDraft(workflow.conditionGroup ?? null);
    } else if (targetAction) {
      setActionDraft(targetAction);
    }
    setHasChanges(false);
    onDirtyChange?.(false);
  }, [selectedNodeId, workflow, isTrigger, isCondition, targetAction, onDirtyChange]);

  function handleDraftChange() {
    setHasChanges(true);
    onDirtyChange?.(true);
  }

  function handleActionKindChange(newKind: ActionKind) {
    if (!actionDraft) return;
    let newConfig = actionDraft.config;

    if (newKind === "webhook") {
      newConfig = {
        name: actionDraft.displayName || "Dispatch webhook",
        method: "POST",
        url: "",
        authType: "none",
      };
    } else if (newKind === "update_tags") {
      newConfig = {
        name: actionDraft.displayName || "Update tags",
        targetResource: "conversation",
        operation: "add",
        tags: [],
      };
    } else if (newKind === "email_notification") {
      newConfig = {
        name: actionDraft.displayName || "Email notification",
        recipients: [],
        subject: "",
        body: "",
      };
    } else if (newKind === "agent_handoff") {
      newConfig = {
        name: actionDraft.displayName || "Agent handoff",
        destinationType: "human",
        destination: "",
      };
    }

    const updated: WorkflowAction = {
      ...actionDraft,
      kind: newKind,
      config: newConfig,
    };
    setActionDraft(updated);
    handleDraftChange();
  }

  function handleApply() {
    if (isTrigger) {
      onApplyTrigger(triggerDraft);
    } else if (isCondition && conditionDraft) {
      onApplyCondition(conditionDraft);
    } else if (actionDraft) {
      onApplyAction(actionDraft);
    }
    setHasChanges(false);
    onDirtyChange?.(false);
  }

  function handleCancel() {
    if (isTrigger) {
      setTriggerDraft(workflow.trigger);
    } else if (isCondition) {
      setConditionDraft(workflow.conditionGroup ?? null);
    } else if (targetAction) {
      setActionDraft(targetAction);
    }
    setHasChanges(false);
    onDirtyChange?.(false);
  }

  // Header icon and labels
  let icon = <Zap className="w-4 h-4 text-heat-100" />;
  let title = "Configure trigger";
  let subtitle = "When this event occurs, the workflow starts.";

  if (isCondition) {
    icon = <Filter className="w-4 h-4 text-neutral-600" />;
    title = "Configure condition";
    subtitle = "Filter events before running actions.";
  } else if (actionDraft) {
    if (actionDraft.kind === "webhook") {
      icon = <Globe className="w-4 h-4 text-heat-100" />;
      title = "Configure action";
      subtitle = "Dispatch an HTTP request when conditions match.";
    } else if (actionDraft.kind === "update_tags") {
      icon = <Tag className="w-4 h-4 text-heat-100" />;
      title = "Configure action";
      subtitle = "Modify resource tags automatically.";
    } else if (actionDraft.kind === "email_notification") {
      icon = <Mail className="w-4 h-4 text-heat-100" />;
      title = "Configure action";
      subtitle = "Send an email alert to designated team members.";
    } else {
      icon = <UserRound className="w-4 h-4 text-heat-100" />;
      title = "Configure action";
      subtitle = "Transfer conversation to an operator or agent.";
    }
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 min-w-0 p-4 flex flex-col justify-between space-y-3 h-full min-h-[460px]">
      {/* Header */}
      <div className="space-y-3 pb-3 border-b border-border-faint">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-accent-black tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-neutral-400">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-6 transition-colors"
            aria-label="Close step inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Type Dropdown (only when editing an action) */}
        {actionDraft && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
              Action type
            </label>
            <select
              value={actionDraft.kind}
              onChange={(e) => handleActionKindChange(e.target.value as ActionKind)}
              className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
            >
              <option value="webhook">Webhook dispatch</option>
              <option value="update_tags">Update tags</option>
              <option value="email_notification">Email notification</option>
              <option value="agent_handoff">Agent handoff</option>
            </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="workflow-step-name" className="text-[11px] font-semibold text-neutral-600 block">Step name</label>
              <input id="workflow-step-name" value={String((actionDraft.config as Record<string, any>).name ?? "")} onChange={event => { setActionDraft({ ...actionDraft, config: { ...actionDraft.config, name: event.target.value } }); handleDraftChange(); }} className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 bg-white" />
            </div>
          </div>
        )}
      </div>

      {/* Body Form */}
      <div className="flex-1 min-w-0 overflow-auto pr-1">
        {isTrigger && (
          <TriggerForm
            trigger={triggerDraft}
            onChange={(up) => {
              setTriggerDraft(up);
              handleDraftChange();
            }}
          />
        )}

        {isCondition && conditionDraft && (
          <ConditionForm
            group={conditionDraft}
            onChange={(up) => {
              setConditionDraft(up);
              handleDraftChange();
            }}
            onRemoveGroup={onRemoveCondition}
          />
        )}

        {actionDraft && (
          <>
            {actionDraft.kind === "webhook" && (
              <WebhookActionForm
                config={actionDraft.config as WebhookActionConfig}
                triggerEventType={workflow.trigger.eventType}
                onChange={(up) => {
                  setActionDraft({ ...actionDraft, config: up });
                  handleDraftChange();
                }}
              />
            )}
            {actionDraft.kind === "update_tags" && (
              <TagActionForm
                config={actionDraft.config as UpdateTagsActionConfig}
                onChange={(up) => {
                  setActionDraft({ ...actionDraft, config: up });
                  handleDraftChange();
                }}
              />
            )}
            {actionDraft.kind === "email_notification" && (
              <EmailActionForm
                config={actionDraft.config as EmailActionConfig}
                onChange={(up) => {
                  setActionDraft({ ...actionDraft, config: up });
                  handleDraftChange();
                }}
              />
            )}
            {actionDraft.kind === "agent_handoff" && (
              <HandoffActionForm
                config={actionDraft.config as HandoffActionConfig}
                onChange={(up) => {
                  setActionDraft({ ...actionDraft, config: up });
                  handleDraftChange();
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-3.5 py-1.5 rounded-8 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 text-xs font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-1.5 rounded-8 bg-heat-100 text-white hover:bg-heat-100/90 text-xs font-semibold transition-colors shadow-sm"
        >
          Apply changes
        </button>
      </div>
    </div>
  );
}
