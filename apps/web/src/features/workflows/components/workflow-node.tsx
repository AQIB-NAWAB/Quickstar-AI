"use client";

import type { WebhookActionConfig, UpdateTagsActionConfig, EmailActionConfig, HandoffActionConfig } from "../lib/types";

import {
ArrowDown,
ArrowUp,
Filter,
Globe,
Mail,
Tag,
Trash2,
UserRound,
Zap,
} from "lucide-react";
import type { ConditionGroup,WorkflowAction,WorkflowTrigger } from "../lib/types";

interface WorkflowNodeProps {
  id: string;
  kind: "trigger" | "condition" | "action";
  stepNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  // Node specifics
  trigger?: WorkflowTrigger;
  conditionGroup?: ConditionGroup;
  action?: WorkflowAction;
  // Reorder & Delete
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
}

export function WorkflowNode({
  kind,
  stepNumber,
  isSelected,
  onSelect,
  trigger,
  conditionGroup,
  action,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: WorkflowNodeProps) {
  // Derive icon, caption, title, summary
  let icon = <Zap className="w-3.5 h-3.5 text-heat-100" />;
  let iconBg = "bg-orange-100";
  let caption = `${stepNumber} · Trigger`;
  let title = trigger?.displayName || "Message appended";
  let subtext = trigger?.eventType || "message.appended";
  let helperNote = kind === "trigger" ? trigger?.description || "When a new message arrives." : "";

  if (kind === "condition" && conditionGroup) {
    icon = <Filter className="w-3.5 h-3.5 text-neutral-600" />;
    iconBg = "bg-neutral-100";
    caption = `${stepNumber} · Condition`;
    title = "Message contains keyword";
    helperNote =
      conditionGroup.logic === "and"
        ? "All conditions must match (AND)."
        : "Any condition may match (OR).";
  } else if (kind === "action" && action) {
    caption = `${stepNumber} · Action`;
    title = action.displayName || "Action";

    if (action.kind === "webhook") {
      const cfg = action.config as WebhookActionConfig;
      icon = <Globe className="w-3.5 h-3.5 text-heat-100" />;
      iconBg = "bg-orange-100";
      title = action.displayName || "Dispatch webhook";
      subtext = `${cfg.method || "POST"} · ${cfg.url ? new URL(cfg.url).host : "notify.example.com"}`;
    } else if (action.kind === "update_tags") {
      const cfg = action.config as UpdateTagsActionConfig;
      icon = <Tag className="w-3.5 h-3.5 text-heat-100" />;
      iconBg = "bg-orange-100";
      title = cfg.name || "Update tags";
      subtext = `${cfg.operation} · ${cfg.tags?.join(", ") || "tags"}`;
    } else if (action.kind === "email_notification") {
      const cfg = action.config as EmailActionConfig;
      icon = <Mail className="w-3.5 h-3.5 text-heat-100" />;
      iconBg = "bg-orange-100";
      title = cfg.name || "Email notification";
      subtext = cfg.recipients?.join(", ") || "team@example.com";
    } else {
      const cfg = action.config as HandoffActionConfig;
      icon = <UserRound className="w-3.5 h-3.5 text-heat-100" />;
      iconBg = "bg-orange-100";
      title = cfg.name || "Agent handoff";
      subtext = `Handoff to ${cfg.destination || "destination"}`;
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`w-[280px] max-w-full rounded-8 p-3 text-left transition-all select-none relative bg-white shadow-xs focus:outline-none ${
        isSelected
          ? "border border-heat-100 bg-orange-50/50"
          : "border border-border-faint hover:border-neutral-300"
      }`}
      aria-selected={isSelected}
    >
      {/* Top row: Icon, Caption, Selected Badge or Actions */}
      <div className="flex items-center justify-between gap-2 pl-11">
        <div className="flex items-center gap-2">
          <div className={`absolute top-3 left-3 w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <span className="text-[11px] font-mono text-neutral-400 font-medium">
            {caption}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isSelected && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-100 text-heat-100 uppercase tracking-wider">
              Selected
            </span>
          )}

          {/* Action reorder and delete controls */}
          {kind === "action" && (
            <div
              className="flex items-center gap-0.5 text-neutral-400"
              onClick={(e) => e.stopPropagation()}
            >
              {canMoveUp && onMoveUp && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  className="p-1 hover:text-neutral-700 rounded hover:bg-neutral-100"
                  title="Move step up"
                  aria-label="Move step up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
              )}
              {canMoveDown && onMoveDown && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  className="p-1 hover:text-neutral-700 rounded hover:bg-neutral-100"
                  title="Move step down"
                  aria-label="Move step down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1 hover:text-red-600 rounded hover:bg-red-50"
                  title="Delete step"
                  aria-label="Delete step"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {kind === "condition" && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:text-red-600 rounded hover:bg-red-50 text-neutral-400"
              title="Remove condition"
              aria-label="Remove condition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Node Title */}
      <h4 className="pl-11 text-sm font-bold text-accent-black tracking-tight">
        {title}
      </h4>

      {/* Subtext / Content */}
      <div className="pl-11 mt-0.5">
        {kind === "condition" && conditionGroup ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1">
              {conditionGroup.rules.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-600 border border-neutral-200"
                >
                  <span className="font-semibold text-accent-black">{r.field}</span>
                  <span className="text-neutral-400">{r.operator}</span>
                  {r.value && <span className="font-semibold">{r.value}</span>}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400">{helperNote}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-[11px] font-mono text-neutral-500 truncate">
              {subtext}
            </p>
            {helperNote && (
              <p className="text-[10px] text-neutral-400 truncate">
                {helperNote}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
