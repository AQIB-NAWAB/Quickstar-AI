"use client";

import React, { useState } from "react";
import { Bell, Mail, X, Braces, Plus, Play, Check } from "lucide-react";
import type { WorkflowNode } from "../../lib/types";

export type NotificationInspectorProps = {
  node: WorkflowNode;
  onUpdateConfig: (config: Record<string, any>) => void;
  onUpdateName: (name: string) => void;
  onClose: () => void;
  onOpenVariablePicker?: (onSelect: (path: string) => void) => void;
  onTestStep?: () => void;
};

export const NotificationInspector: React.FC<NotificationInspectorProps> = ({
  node,
  onUpdateConfig,
  onUpdateName,
  onClose,
  onOpenVariablePicker,
  onTestStep,
}) => {
  const cfg = (node.config as Record<string, any>) || {};
  const delivery = cfg.delivery || "email";
  const recipients: string[] = Array.isArray(cfg.recipients) ? cfg.recipients : [];
  const subject = cfg.subject || "";
  const body = cfg.message ?? cfg.body ?? "";
  const sender = cfg.sender || "";

  const [newRecipient, setNewRecipient] = useState("");

  const addRecipient = () => {
    const trimmed = newRecipient.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      onUpdateConfig({ ...cfg, recipients: [...recipients, trimmed] });
      setNewRecipient("");
    }
  };

  const removeRecipient = (index: number) => {
    const updated = recipients.filter((_, i) => i !== index);
    onUpdateConfig({ ...cfg, recipients: updated });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200 w-[420px] select-none text-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            {delivery === "email" ? <Mail className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Notification & Email</h3>
            <p className="text-[11px] text-neutral-500">
              Send automated messages to team or customer
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {/* Step Name */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Step Name</label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdateName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
            placeholder="e.g. Alert On-Call Team"
          />
        </div>

        <p className="rounded-md bg-amber-50 p-3 text-amber-800">
          Delivery integration is not connected. You can edit this draft and simulate it; activation
          is blocked until delivery is available.
        </p>
        {/* Delivery Mode Toggle */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Delivery Channel</label>
          <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onUpdateConfig({ ...cfg, delivery: "email" })}
              className={`py-1.5 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 transition-colors ${
                delivery === "email"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Message</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ ...cfg, delivery: "inbox" })}
              className={`py-1.5 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 transition-colors ${
                delivery === "inbox"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Inbox Alert</span>
            </button>
          </div>
        </div>

        {/* Sender Email */}
        {delivery === "email" && (
          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-700">From Address</label>
            <input
              type="text"
              value={sender}
              onChange={(e) => onUpdateConfig({ ...cfg, sender: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
            />
          </div>
        )}

        {/* Recipients Multi-chip Input */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Recipients</label>
          <div className="p-2 border border-neutral-300 rounded-lg space-y-2 bg-white">
            <div className="flex flex-wrap gap-1.5">
              {recipients.map((r, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-medium"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => removeRecipient(idx)}
                    className="hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
                placeholder="Add email or team handle, press Enter"
                className="flex-1 text-xs outline-none"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-neutral-700">Subject</label>
            {onOpenVariablePicker && (
              <button
                type="button"
                onClick={() =>
                  onOpenVariablePicker((path) =>
                    onUpdateConfig({ ...cfg, subject: `${subject}{{${path}}}` }),
                  )
                }
                className="text-[11px] text-[#FA5D19] font-medium hover:underline flex items-center gap-1"
              >
                <Braces className="w-3 h-3" />
                <span>Insert variable</span>
              </button>
            )}
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => onUpdateConfig({ ...cfg, subject: e.target.value })}
            placeholder="e.g. Alert: High Priority Customer in Queue {{event.conversation_id}}"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>

        {/* Body Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-neutral-700">Body Content</label>
            {onOpenVariablePicker && (
              <button
                type="button"
                onClick={() =>
                  onOpenVariablePicker((path) =>
                    onUpdateConfig({ ...cfg, body: `${body}{{${path}}}` }),
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
            rows={5}
            value={body}
            onChange={(e) => onUpdateConfig({ ...cfg, body: e.target.value })}
            placeholder="Enter notification message here. Supports variables like {{event.conversation_id}}..."
            className="w-full p-3 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19] leading-relaxed"
          />
        </div>

        {/* Email Preview Card */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Email Delivery Preview
          </span>
          <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 border-b border-neutral-100 pb-1.5">
              <span className="font-bold text-neutral-800">To:</span>
              <span className="truncate">{recipients.join(", ") || "(no recipients added)"}</span>
            </div>
            <div className="text-xs font-semibold text-neutral-900 truncate">
              {subject || "(Subject not specified)"}
            </div>
            <div className="text-[11px] text-neutral-600 whitespace-pre-wrap line-clamp-3">
              {body || "(Message body empty)"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">Single output port (Success)</span>
        {onTestStep && (
          <button
            onClick={onTestStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Test Dispatch</span>
          </button>
        )}
      </div>
    </div>
  );
};
