"use client";

import React, { useState } from "react";
import {
  X,
  GitBranch,
  Globe,
  UserCheck,
  Bell,
  Tag,
  FileText,
  Flag,
  Search,
  ArrowRight,
} from "lucide-react";
import type { WorkflowNodeType } from "../../lib/types";

export type ActionCatalogDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  onSelectAction: (
    type: WorkflowNodeType,
    metadata: { name: string; config: Record<string, any> },
  ) => void;
};

type CatalogItem = {
  type: WorkflowNodeType;
  title: string;
  category: "Logic & Routing" | "Integrations" | "Communications" | "Data & Operations";
  description: string;
  badge?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  defaultConfig: Record<string, any>;
};

const CATALOG: CatalogItem[] = [
  {
    type: "condition",
    title: "Condition / Branch",
    category: "Logic & Routing",
    description:
      "Evaluate incoming variables with typed operators and branch execution based on matches.",
    badge: "Control Flow",
    icon: <GitBranch className="w-5 h-5 text-amber-600" />,
    iconBgColor: "bg-amber-100 text-amber-600",
    defaultConfig: {
      root_group: {
        id: "grp_cond",
        logic: "and",
        rules: [{ id: "r1", field: "message.text", operator: "contains", value: "" }],
      },
      missing_value_behavior: "not_matched",
    },
  },
  {
    type: "webhook",
    title: "HTTP Request",
    category: "Integrations",
    description:
      "Make an outbound HTTP/REST API call with customizable headers, query params, and JSON body template.",
    badge: "REST Webhook",
    icon: <Globe className="w-5 h-5 text-blue-600" />,
    iconBgColor: "bg-blue-100 text-blue-600",
    defaultConfig: {
      method: "POST",
      url: "",
      auth_type: "none",
      body: '{\n  "conversation_id": "{{event.conversation_id}}"\n}',
    },
  },
  {
    type: "agent_handoff",
    title: "Agent Handoff",
    category: "Communications",
    description:
      "Transfer the conversation to a human operator queue, optionally pausing AI automatic responses.",
    badge: "Support Queue",
    icon: <UserCheck className="w-5 h-5 text-indigo-600" />,
    iconBgColor: "bg-indigo-100 text-indigo-600",
    defaultConfig: {
      queue_id: "",
      priority: "normal",
      pause_ai_replies: true,
      visitor_message: "Connecting you with an agent now...",
    },
  },
  {
    type: "notification",
    title: "Send Notification / Email",
    category: "Communications",
    description: "Dispatch automated email messages or internal dashboard alerts to team members.",
    badge: "Outbox Alert",
    icon: <Bell className="w-5 h-5 text-emerald-600" />,
    iconBgColor: "bg-emerald-100 text-emerald-600",
    defaultConfig: {
      delivery: "email",
      recipients: [],
      subject: "Workflow Alert: {{event.conversation_id}}",
      body: "A customer message triggered an alert.",
    },
  },
  {
    type: "update_tags",
    title: "Update Conversation Tags",
    category: "Data & Operations",
    description: "Add, remove, or assign categorization tags on the active conversation thread.",
    badge: "CRM Tagging",
    icon: <Tag className="w-5 h-5 text-cyan-600" />,
    iconBgColor: "bg-cyan-100 text-cyan-600",
    defaultConfig: {
      target_resource: "conversation",
      operation: "add",
      tags: ["workflow-processed"],
    },
  },
  {
    type: "log",
    title: "Audit Log Trace",
    category: "Data & Operations",
    description: "Emit an informational or audit log event into the workflow execution record.",
    badge: "Telemetry",
    icon: <FileText className="w-5 h-5 text-slate-600" />,
    iconBgColor: "bg-slate-100 text-slate-600",
    defaultConfig: {
      level: "info",
      message: "Workflow executed checkpoint for conversation {{event.conversation_id}}",
    },
  },
  {
    type: "end",
    title: "End Workflow",
    category: "Logic & Routing",
    description: "Explicitly mark this branch or path as completed without further action.",
    badge: "Terminal",
    icon: <Flag className="w-5 h-5 text-rose-600" />,
    iconBgColor: "bg-rose-100 text-rose-600",
    defaultConfig: {
      reason: "completed",
    },
  },
];

export const ActionCatalogDialog: React.FC<ActionCatalogDialogProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  context,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Actions");
  const [activeItem, setActiveItem] = useState<CatalogItem>(CATALOG[0]);

  if (!isOpen) return null;

  const categories = [
    "All Actions",
    "Logic & Routing",
    "Integrations",
    "Communications",
    "Data & Operations",
  ];

  const filtered = CATALOG.filter((item) => {
    const matchesCategory =
      selectedCategory === "All Actions" || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConfirm = () => {
    onSelectAction(activeItem.type, {
      name: activeItem.title,
      config: { ...activeItem.defaultConfig },
    });
    onClose();
  };

  return (
    <div className="h-full w-[420px] shrink-0 border-l border-neutral-200 bg-white">
      <div className="h-full bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Add a step</h2>
            <p className="text-xs text-neutral-500">
              {context || "Choose an action or condition to add to the canvas"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-neutral-200 bg-white flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search steps, integrations, triggers..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-neutral-900 text-white"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Split View: List on left, preview on right */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Action List */}
          <div className="p-4 space-y-1">
            {filtered.map((item) => (
              <div
                key={item.type}
                onClick={() => setActiveItem(item)}
                onDoubleClick={handleConfirm}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  activeItem.type === item.type
                    ? "bg-orange-50/60 border-[#FA5D19] ring-1 ring-[#FA5D19]/20"
                    : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.iconBgColor}`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-neutral-900 truncate">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-600">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-neutral-400 text-xs">
                No actions found matching "{search}".
              </div>
            )}
          </div>

          {/* Selected Action Preview Pane */}
          <div className="w-full p-5 bg-neutral-50 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeItem.iconBgColor}`}
                >
                  {activeItem.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">{activeItem.title}</h4>
                  <span className="text-xs text-neutral-500">{activeItem.category}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-700 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                <span className="font-semibold text-neutral-900 block">Capabilities</span>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  {activeItem.description}
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-neutral-900">Output Ports</span>
                {activeItem.type === "condition" && (
                  <div className="space-y-1 text-[11px] text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Matched (rules passed)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neutral-400" />
                      <span>Not matched (rules failed)</span>
                    </div>
                  </div>
                )}
                {activeItem.type === "webhook" && (
                  <div className="space-y-1 text-[11px] text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Success (2xx HTTP response)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Error (Timeout or 4xx/5xx failure)</span>
                    </div>
                  </div>
                )}
                {activeItem.type !== "condition" && activeItem.type !== "webhook" && (
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                    <span className="w-2 h-2 rounded-full bg-neutral-600" />
                    <span>Single standard output</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-2.5 px-4 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Add to Workflow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
