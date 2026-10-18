"use client";

import React, { useState } from "react";
import { X, Search, Copy, Check, ChevronRight, ChevronDown, Braces } from "lucide-react";

export type VariablePickerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectVariable: (path: string) => void;
};

type VariableItem = {
  path: string;
  label: string;
  type: "string" | "number" | "boolean" | "object";
  sampleValue: string;
  category: "event" | "steps" | "system";
};

const VARIABLES: VariableItem[] = [
  {
    path: "event.conversation_id",
    label: "Conversation ID",
    type: "string",
    sampleValue: "conv_89f2b3",
    category: "event",
  },
  {
    path: "event.message.id",
    label: "Message ID",
    type: "string",
    sampleValue: "msg_4019a",
    category: "event",
  },
  {
    path: "event.message.text",
    label: "Message Text",
    type: "string",
    sampleValue: "I want an enterprise demo and pricing",
    category: "event",
  },
  {
    path: "event.message.role",
    label: "Sender Type",
    type: "string",
    sampleValue: "user",
    category: "event",
  },
  {
    path: "event.message.seq",
    label: "Message sequence",
    type: "string",
    sampleValue: "1",
    category: "event",
  },
];

export const VariablePickerDialog: React.FC<VariablePickerDialogProps> = ({
  isOpen,
  onClose,
  onSelectVariable,
}) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"event" | "steps" | "system">("event");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = VARIABLES.filter((v) => {
    const matchesTab = v.category === activeTab;
    const matchesSearch =
      v.path.toLowerCase().includes(search.toLowerCase()) ||
      v.label.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const handleSelect = (path: string) => {
    onSelectVariable(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent pointer-events-none p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 pointer-events-auto w-[640px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Braces className="w-5 h-5 text-[#FA5D19]" />
            <div>
              <h2 className="text-base font-bold text-neutral-900">Insert Variable</h2>
              <p className="text-xs text-neutral-500">
                Choose a dynamic value from the event payload or previous steps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variable path, e.g. message.text..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-neutral-200 px-4 bg-neutral-50/40">
          {(
            [
              { id: "event", label: "Event Payload" },
              { id: "steps", label: "Step Outputs" },
              { id: "system", label: "System & Workspace" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#FA5D19] text-[#FA5D19]"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="p-4 text-xs text-neutral-500">
            No guaranteed values available in this category for this step.
          </p>
        )}
        {/* Variables List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((item) => (
            <div
              key={item.path}
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50 transition-all group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-neutral-900">
                    {`{{${item.path}}}`}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-100 text-neutral-600">
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                  <span>{item.label}</span>
                  <span>•</span>
                  <span className="truncate italic">Sample: "{item.sampleValue}"</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(item.path)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Copy placeholder"
                >
                  {copiedPath === item.path ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(item.path)}
                  className="px-3 py-1.5 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Insert
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10 text-neutral-400 text-xs">
              No variables found in this category.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 text-[11px] text-neutral-500 flex items-center justify-between">
          <span>Variables are resolved at runtime in triggers, conditions, and actions.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-neutral-600 hover:text-neutral-900 text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
