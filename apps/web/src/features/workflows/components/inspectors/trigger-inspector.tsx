"use client";

import React from "react";
import { Zap, X, Shield, Copy, Check, Play } from "lucide-react";
import type { WorkflowNode } from "../../lib/types";

export type TriggerInspectorProps = {
  node: WorkflowNode;
  onUpdateConfig: (config: Record<string, any>) => void;
  onUpdateName: (name: string) => void;
  onClose: () => void;
  onTestStep?: () => void;
};

const EVENT_TYPES = [
  {
    value: "message.appended",
    label: "Message Appended (Visitor or Agent)",
    desc: "Triggers on each new chat message",
  },

  {
    value: "conversation.handed_off",
    label: "Conversation Handed Off",
    desc: "Triggers on transfer to queue or human",
  },
  {
    value: "conversation.released",
    label: "Conversation Released",
    desc: "Triggers when an operator resolves/closes a chat",
  },
  {
    value: "agent.published",
    label: "Agent Published",
    desc: "Triggers when a new bot version is released",
  },
];

export const TriggerInspector: React.FC<TriggerInspectorProps> = ({
  node,
  onUpdateConfig,
  onUpdateName,
  onClose,
  onTestStep,
}) => {
  const cfg = (node.config as Record<string, any>) || {};
  const [copied, setCopied] = React.useState(false);

  const sampleJson = JSON.stringify(
    cfg.sample_payload || {
      id: "evt_sample_01",
      type: cfg.event_type || "message.appended",
      conversation_id: "conv_89f2b",
      message: {
        id: "msg_90a",
        text: "I want an enterprise demo and pricing",
        sender_type: "user",
        role: "user",
        created_at: new Date().toISOString(),
      },
      customer: {
        id: "cust_32",
        tier: "Enterprise",
        email: "sample@example.test",
      },
    },
    null,
    2,
  );

  const copySample = () => {
    navigator.clipboard.writeText(sampleJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200 w-[420px] select-none text-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FA5D19] flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Trigger Configuration</h3>
            <p className="text-[11px] text-neutral-500">Define what starts this workflow</p>
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
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Step Name */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Step Name</label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdateName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-[#FA5D19] focus:border-[#FA5D19] outline-none"
            placeholder="e.g. Visitor message received"
          />
        </div>

        {/* Trigger Event Type */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Trigger Event</label>
          <select
            value={cfg.event_type || "message.appended"}
            onChange={(e) => onUpdateConfig({ ...cfg, event_type: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#FA5D19] focus:border-[#FA5D19] outline-none"
          >
            {EVENT_TYPES.map((ev) => (
              <option key={ev.value} value={ev.value}>
                {ev.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-500">
            {EVENT_TYPES.find((e) => e.value === (cfg.event_type || "message.appended"))?.desc}
          </p>
        </div>

        {/* Run For (Scope) */}
        <div className="space-y-2">
          <label className="font-semibold text-neutral-700">Execute For</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
              <input
                type="radio"
                name="run_for"
                value="visitor_messages"
                checked={(cfg.run_for ?? "visitor_messages") === "visitor_messages"}
                onChange={() => onUpdateConfig({ ...cfg, run_for: "visitor_messages" })}
                className="text-[#FA5D19] focus:ring-[#FA5D19]"
              />
              <div>
                <span className="font-medium text-neutral-900 block">Visitor messages only</span>
                <span className="text-[11px] text-neutral-500">
                  Ignores bot responses, team replies, and workflow messages
                </span>
              </div>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
              <input
                type="radio"
                name="run_for"
                value="all_messages"
                checked={cfg.run_for === "all_messages"}
                onChange={() => onUpdateConfig({ ...cfg, run_for: "all_messages" })}
                className="text-[#FA5D19] focus:ring-[#FA5D19]"
              />
              <div>
                <span className="font-medium text-neutral-900 block">All incoming messages</span>
                <span className="text-[11px] text-neutral-500">
                  Processes user, assistant, and system generated events
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-neutral-700">Agent Scope</label>
            <select
              value={cfg.agent_scope || "all"}
              onChange={(e) => onUpdateConfig({ ...cfg, agent_scope: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white outline-none"
            >
              <option value="all">All agents</option>
              <option disabled value="specific">
                Specific agent · configuration unavailable
              </option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-neutral-700">Channel Scope</label>
            <select
              value={cfg.channel_scope || "all"}
              onChange={(e) => onUpdateConfig({ ...cfg, channel_scope: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white outline-none"
            >
              <option value="all">All channels</option>
              <option disabled value="web_widget">Website Widget</option>
              <option disabled value="api">API / Webhook</option>
            </select>
          </div>
        </div>

        {/* Safety toggles */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
            <Shield className="w-3.5 h-3.5 text-neutral-600" />
            <span>Recursion & Loop Guards</span>
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-neutral-600">Ignore workflow-generated events</span>
            <input
              type="checkbox"
              checked={cfg.ignore_workflow_generated ?? true}
              onChange={(e) =>
                onUpdateConfig({ ...cfg, ignore_workflow_generated: e.target.checked })
              }
              className="rounded text-[#FA5D19] focus:ring-[#FA5D19]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-neutral-600">Deduplicate identical events</span>
            <input
              type="checkbox"
              checked={cfg.deduplicate_events ?? true}
              onChange={(e) => onUpdateConfig({ ...cfg, deduplicate_events: e.target.checked })}
              className="rounded text-[#FA5D19] focus:ring-[#FA5D19]"
            />
          </label>
        </div>

        {/* Sample Payload Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-neutral-700">Sample Event Payload</label>
            <button
              onClick={copySample}
              className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>
          </div>
          <pre className="p-3 bg-neutral-50 text-neutral-800 font-mono text-[11px] rounded-lg overflow-x-auto max-h-[160px] leading-tight">
            {sampleJson}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">Entry node (triggers automatically)</span>
        {onTestStep && (
          <button
            onClick={onTestStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Test Trigger</span>
          </button>
        )}
      </div>
    </div>
  );
};
