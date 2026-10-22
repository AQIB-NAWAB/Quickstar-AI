"use client";

import React from "react";
import { UserCheck, X, Braces, Play } from "lucide-react";
import type { WorkflowNode } from "../../lib/types";

export type HandoffInspectorProps = {
  node: WorkflowNode;
  onUpdateConfig: (config: Record<string, any>) => void;
  onUpdateName: (name: string) => void;
  onClose: () => void;
  onOpenVariablePicker?: (onSelect: (path: string) => void) => void;
  onTestStep?: () => void;
};

const QUEUES: Array<{ id: string; name: string; agentsOnline: number; category: string }> = [];

export const HandoffInspector: React.FC<HandoffInspectorProps> = ({
  node,
  onUpdateConfig,
  onUpdateName,
  onClose,
  onOpenVariablePicker,
  onTestStep,
}) => {
  const cfg = (node.config as Record<string, any>) || {};
  const queueId = cfg.queue_id || cfg.destination || "";
  const priority = cfg.priority || "normal";
  const pauseAi = cfg.pause_ai_replies ?? true;
  const visitorMsg =
    typeof cfg.visitor_message === "string"
      ? cfg.visitor_message
      : (cfg.visitor_message?.text ?? "");
  const internalNote = cfg.internal_note || cfg.note || "";

  const selectedQueue = QUEUES.find((q) => q.id === queueId) || {
    id: queueId,
    name: queueId || "No queue configured",
    agentsOnline: 0,
    category: "",
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200 w-[420px] select-none text-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Agent Handoff</h3>
            <p className="text-[11px] text-neutral-500">
              Route conversation to a live operator queue
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Form */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {/* Step Name */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Step Name</label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdateName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
            placeholder="e.g. Route to Tier-1 Support"
          />
        </div>

        {/* Queue Selection */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Destination Queue</label>
          <input
            type="text"
            value={queueId}
            onChange={(e) => onUpdateConfig({ ...cfg, queue_id: e.target.value })}
            placeholder="e.g. default, tier-1-support, or queue UUID"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
          />
          <p className="text-[11px] text-neutral-500">
            Leave blank to route to the workspace default operator queue.
          </p>
        </div>

        {/* Priority Setting */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Queue Priority</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["low", "normal", "high", "urgent"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onUpdateConfig({ ...cfg, priority: p })}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                  priority === p
                    ? p === "urgent"
                      ? "bg-rose-50 border-rose-400 text-rose-700 ring-1 ring-rose-200"
                      : p === "high"
                        ? "bg-amber-50 border-amber-400 text-amber-800 ring-1 ring-amber-200"
                        : "bg-orange-50 border-[#FA5D19] text-[#FA5D19] ring-1 ring-[#FA5D19]/20"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* AI Reply Pause Toggle */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-neutral-900 block">
                Pause Automated AI Replies
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Prevents automated responses while awaiting human operator
              </span>
            </div>
            <input
              type="checkbox"
              checked={pauseAi}
              onChange={(e) => onUpdateConfig({ ...cfg, pause_ai_replies: e.target.checked })}
              className="rounded text-[#FA5D19] focus:ring-[#FA5D19] w-4 h-4"
            />
          </label>
        </div>

        {/* Visitor Canned Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-neutral-700">Visitor Message</label>
            {onOpenVariablePicker && (
              <button
                type="button"
                onClick={() =>
                  onOpenVariablePicker((path) =>
                    onUpdateConfig({ ...cfg, visitor_message: `${visitorMsg}{{${path}}}` }),
                  )
                }
                className="text-[11px] text-[#FA5D19] font-medium hover:underline flex items-center gap-1"
              >
                <Braces className="w-3 h-3" />
                <span>Insert variable</span>
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={visitorMsg}
            onChange={(e) => onUpdateConfig({ ...cfg, visitor_message: e.target.value })}
            placeholder="I am connecting you with a representative right now. One moment..."
            className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>

        {/* Internal Audit Note */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Internal Audit Note</label>
          <textarea
            rows={2}
            value={internalNote}
            onChange={(e) => onUpdateConfig({ ...cfg, internal_note: e.target.value })}
            placeholder="Reason for handoff, e.g. Customer requested support agent or high-tier intent detected."
            className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>

        {/* Inbox Preview Card */}
        <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>OPERATOR INBOX PREVIEW</span>
            <span className="font-bold text-amber-400 uppercase">{priority} PRIORITY</span>
          </div>
          <div className="p-2.5 bg-neutral-800 rounded-lg space-y-1 border border-neutral-700">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span>{selectedQueue.name}</span>
              <span className="text-[10px] text-emerald-400">● Live Waiting</span>
            </div>
            <p className="text-[11px] text-neutral-300 truncate">
              {visitorMsg || "Connecting with human representative..."}
            </p>
            {internalNote && (
              <p className="text-[10px] text-neutral-400 italic pt-1 border-t border-neutral-700">
                Note: {internalNote}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">AI replies paused automatically</span>
        {onTestStep && (
          <button
            onClick={onTestStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Simulate workflow</span>
          </button>
        )}
      </div>
    </div>
  );
};
