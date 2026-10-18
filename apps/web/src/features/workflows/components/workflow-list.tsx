"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  Play,
  History,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MoreVertical,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { WorkflowListItem, WorkflowStatsData } from "../lib/types";
import { formatUtcDateTime } from "../lib/format";
import { WorkflowStatusBadge } from "./workflow-status-badge";
import { DeleteWorkflowDialog } from "./delete-workflow-dialog";

export interface WorkflowListProps {
  workflows: WorkflowListItem[];
  stats?: WorkflowStatsData;
  isUnavailable?: boolean;
  newWorkflowUrl: string;
  getWorkflowUrl: (id: string) => string;
  getRunsUrl: (id: string) => string;
  onDeleteWorkflow?: (id: string) => Promise<void> | void;
  onOpenTemplates?: () => void;
  onToggleStatus?: (id: string, currentStatus: string) => Promise<void> | void;
}

export function WorkflowList({
  workflows,
  stats,
  isUnavailable = false,
  newWorkflowUrl,
  getWorkflowUrl,
  getRunsUrl,
  onDeleteWorkflow,
  onOpenTemplates,
  onToggleStatus,
}: WorkflowListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "success">("updated");
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowListItem | null>(null);

  if (isUnavailable) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FA5D19] flex items-center justify-center mx-auto text-xl font-bold">
          ⚙️
        </div>
        <h2 className="text-base font-bold text-neutral-900">Workflow automation is unavailable</h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
          The workflow service connection is currently offline. Try again shortly or contact your
          workspace administrator.
        </p>
      </div>
    );
  }

  // Derive stats if not provided
  const activeCount =
    stats?.activeWorkflows ?? workflows.filter((w) => w.status === "active").length;
  const totalExecs = stats?.runsToday ?? null;
  const avgSuccessRate = stats?.avgSuccessRate ?? null;
  const needsAttention = stats?.needsAttentionCount ?? 0;

  // Derive unique triggers
  const uniqueTriggers = Array.from(new Set(workflows.map((w) => w.triggerEventType))).filter(
    Boolean,
  );

  const filteredWorkflows = workflows
    .filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;
      const matchesTrigger = triggerFilter === "all" || w.triggerEventType === triggerFilter;
      return matchesSearch && matchesStatus && matchesTrigger;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "success") return (b.successRate7d ?? 0) - (a.successRate7d ?? 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Workflows</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Automate events, route conversations, and connect your tools.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="px-3.5 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FA5D19]" />
              <span>Browse Templates</span>
            </button>
          )}

          <Link
            href={newWorkflowUrl}
            className="px-4 py-2 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-neutral-200 rounded-lg border border-neutral-200 bg-white md:grid-cols-4">
        {[
          { label: "Active workflows", value: activeCount },
          { label: "Runs today", value: totalExecs ?? "—" },
          {
            label: "Success rate · 7 days",
            value: avgSuccessRate === null ? "—" : `${avgSuccessRate}%`,
          },
          { label: "Needs attention", value: needsAttention },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4">
            <p className="text-xs text-neutral-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workflows by name or description..."
            className="w-full pl-9 pr-3 py-1.5 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-medium">
            {(["all", "active", "draft", "paused"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-white text-neutral-900 font-bold shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Trigger filter */}
          {uniqueTriggers.length > 0 && (
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-200 rounded-xl text-xs bg-white text-neutral-700 outline-none"
            >
              <option value="all">All Triggers</option>
              {uniqueTriggers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 border border-neutral-200 rounded-xl text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="updated">Recently Updated</option>
            <option value="name">Alphabetical</option>
            <option value="success">Success Rate</option>
          </select>
        </div>
      </div>

      {/* Workflows Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold text-[11px]">
              <th className="py-3 px-4">Workflow Name</th>
              <th className="py-3 px-4">Trigger Event</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Success Rate (7d)</th>
              <th className="py-3 px-4">Last Executed</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredWorkflows.map((w) => (
              <tr key={w.id} className="hover:bg-neutral-50/60 transition-colors group">
                <td className="py-3.5 px-4">
                  <Link
                    href={getWorkflowUrl(w.id)}
                    className="font-bold text-neutral-900 hover:text-[#FA5D19] transition-colors block text-sm"
                  >
                    {w.name}
                  </Link>
                  {w.description && (
                    <span className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                      {w.description}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {w.activeVersionNumber ? (
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                        v{w.activeVersionNumber}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded">
                        rev #{w.draftRevision ?? 1} (Draft)
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <span className="font-mono text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold border border-purple-100">
                    {w.triggerEventType}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <WorkflowStatusBadge status={w.status} />
                    {onToggleStatus && (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(w.id, w.status)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                          w.status === "active"
                            ? "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                            : "text-[#FA5D19] hover:bg-orange-50"
                        }`}
                      >
                        {w.status === "active" ? "Pause" : "Activate"}
                      </button>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${w.successRate7d ?? 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-neutral-800 text-[11px]">
                      {w.successRate7d !== null ? `${w.successRate7d}%` : "100%"}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-neutral-500 text-[11px]">
                  {w.lastTriggeredAt ? (
                    formatUtcDateTime(w.lastTriggeredAt)
                  ) : (
                    <span className="text-neutral-400 italic">Never triggered</span>
                  )}
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={getWorkflowUrl(w.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={getRunsUrl(w.id)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                      title="View execution history"
                    >
                      <History className="w-4 h-4" />
                    </Link>
                    {onDeleteWorkflow && (
                      <button
                        onClick={() => setWorkflowToDelete(w)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filteredWorkflows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 text-xs">
                  No workflows found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Template Promotion Banner */}
      {onOpenTemplates && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 via-white to-purple-50 border border-orange-200/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FA5D19] text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900">
                Explore 6 Pre-Built Automation Templates
              </h3>
              <p className="text-[11px] text-neutral-600">
                Lead qualification, human handoff with AI reply pause, VIP customer escalation, CSAT
                surveys, and more.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenTemplates}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {workflowToDelete && onDeleteWorkflow && (
        <DeleteWorkflowDialog
          open={true}
          workflowName={workflowToDelete.name}
          onCancel={() => setWorkflowToDelete(null)}
          onConfirm={async () => {
            await onDeleteWorkflow(workflowToDelete.id);
            setWorkflowToDelete(null);
          }}
        />
      )}
    </div>
  );
}
