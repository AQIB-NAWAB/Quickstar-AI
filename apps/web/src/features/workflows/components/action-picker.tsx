"use client";

import { Globe,Mail,Tag,UserRound,X } from "lucide-react";
import React from "react";
import type { ActionKind,WorkflowAction } from "../lib/types";

interface ActionPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectAction: (newAction: WorkflowAction) => void;
}

const ACTION_OPTIONS: {
  kind: ActionKind;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    kind: "webhook",
    name: "Webhook dispatch",
    description: "Dispatch an HTTP request when conditions match.",
    icon: Globe,
  },
  {
    kind: "update_tags",
    name: "Update tags",
    description: "Add or remove tags on conversation or lead.",
    icon: Tag,
  },
  {
    kind: "email_notification",
    name: "Email notification",
    description: "Send an email alert to designated team members.",
    icon: Mail,
  },
  {
    kind: "agent_handoff",
    name: "Agent handoff",
    description: "Transfer conversation to an operator or agent.",
    icon: UserRound,
  },
];

export function ActionPicker({
  open,
  onClose,
  onSelectAction,
}: ActionPickerProps) {
  if (!open) return null;

  function handlePick(kind: ActionKind, defaultName: string) {
    const id = `node-action-${Date.now()}`;
    let newAction: WorkflowAction;

    if (kind === "webhook") {
      newAction = {
        id,
        kind,
        displayName: defaultName,
        config: {
          name: defaultName,
          method: "POST",
          url: "",
          authType: "none",
        },
      };
    } else if (kind === "update_tags") {
      newAction = {
        id,
        kind,
        displayName: defaultName,
        config: {
          name: defaultName,
          targetResource: "conversation",
          operation: "add",
          tags: ["support"],
        },
      };
    } else if (kind === "email_notification") {
      newAction = {
        id,
        kind,
        displayName: defaultName,
        config: {
          name: defaultName,
          recipients: ["team@example.com"],
          subject: "Workflow Alert",
          body: "Workflow executed.",
        },
      };
    } else {
      newAction = {
        id,
        kind,
        displayName: defaultName,
        config: {
          name: defaultName,
          destinationType: "human",
          destination: "support-agent",
        },
      };
    }

    onSelectAction(newAction);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white rounded-12 border border-border-faint shadow-xl p-5 space-y-3 animate-in fade-in-50 zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-2 border-b border-border-faint">
          <div>
            <h3 className="text-sm font-bold text-accent-black tracking-tight">
              Add action
            </h3>
            <p className="text-[11px] text-neutral-400">
              Select an action to add to your chain.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-6"
            aria-label="Close action picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          {ACTION_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.kind}
                type="button"
                onClick={() => handlePick(opt.kind, opt.name)}
                className="w-full text-left p-3 rounded-8 border border-border-faint hover:border-heat-100 hover:bg-orange-50/20 transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-orange-100 flex items-center justify-center shrink-0 transition-colors">
                  <Icon className="w-4 h-4 text-neutral-600 group-hover:text-heat-100 transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-accent-black group-hover:text-heat-100 transition-colors">
                    {opt.name}
                  </p>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
