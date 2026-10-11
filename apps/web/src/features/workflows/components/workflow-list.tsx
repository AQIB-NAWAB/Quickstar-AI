"use client";

import { Plus,Search,Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatSuccessRate,formatUtcDateTime } from "../lib/format";
import type { WorkflowListItem } from "../lib/types";
import { DeleteWorkflowDialog } from "./delete-workflow-dialog";
import { WorkflowStatusBadge } from "./workflow-status-badge";

interface WorkflowListProps {
  workflows: WorkflowListItem[];
  isUnavailable?: boolean;
  newWorkflowUrl: string;
  getWorkflowUrl: (id: string) => string;
  getRunsUrl: (id: string) => string;
  onDeleteWorkflow?: (id: string) => Promise<void> | void;
}

export function WorkflowList({
  workflows,
  isUnavailable = false,
  newWorkflowUrl,
  getWorkflowUrl,
  getRunsUrl,
  onDeleteWorkflow,
}: WorkflowListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");

  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowListItem | null>(null);

  // If backend is unavailable (production mode without workflow service)
  if (isUnavailable) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
          <div>
            <h1 className="text-2xl font-bold text-accent-black tracking-tight">
              Workflows
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Build event-driven automations and follow their execution.
            </p>
          </div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <span className="text-xl">⚙️</span>
          </div>
          <h2 className="text-base font-bold text-accent-black tracking-tight">
            Workflow automation is not available yet.
          </h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            This workspace’s workflow service is not connected. Workflow definitions, trigger consumers, and orchestration execution APIs are pending backend implementation.
          </p>
          <div className="pt-2">
            <p className="text-[11px] font-mono text-neutral-400">
              See apps/web/src/features/workflows/BACKEND_DEPENDENCIES.md for contracts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Derive unique trigger types from workflows for filter
  const uniqueTriggers = Array.from(
    new Set(workflows.map((w) => w.triggerEventType))
  );

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || w.status === statusFilter;

    const matchesTrigger =
      triggerFilter === "all" || w.triggerEventType === triggerFilter;

    return matchesSearch && matchesStatus && matchesTrigger;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
        <div>
          <h1 className="text-2xl font-bold text-accent-black tracking-tight">
            Workflows
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Build event-driven automations and follow their execution.
          </p>
        </div>

        <Link
          href={newWorkflowUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] shadow-xs transition-colors shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create workflow</span>
        </Link>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workflows by name..."
            className="w-full pl-9 pr-3 py-1.5 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-neutral-700"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-border-faint rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400">Trigger:</span>
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-border-faint rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
              aria-label="Filter by trigger"
            >
              <option value="all">All triggers</option>
              {uniqueTriggers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <span className="text-[10px] text-neutral-400 italic hidden md:inline">
            Local filter
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-faint bg-neutral-50/50 text-neutral-400 font-medium">
                <th className="py-2.5 px-4 font-medium">Workflow</th>
                <th className="py-2.5 px-4 font-medium">Trigger</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Last triggered</th>
                <th className="py-2.5 px-4 font-medium">Success rate &middot; 7d</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              {filteredWorkflows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-sm font-semibold text-accent-black">
                      No workflows yet.
                    </p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                      Create a workflow to connect an event, conditions, and actions.
                    </p>
                    <Link
                      href={newWorkflowUrl}
                      className="inline-flex items-center gap-1 px-3 py-1.5 mt-3 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create workflow</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredWorkflows.map((w) => {
                  const builderUrl = getWorkflowUrl(w.id);
                  const runsUrl = getRunsUrl(w.id);

                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-neutral-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={builderUrl}
                          className="font-semibold text-accent-black hover:text-heat-100 transition-colors block leading-snug"
                        >
                          {w.name}
                        </Link>
                        {w.description && (
                          <p className="text-[11px] text-neutral-400 truncate max-w-xs mt-0.5">
                            {w.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                        {w.triggerEventType}
                      </td>
                      <td className="py-3 px-4">
                        <WorkflowStatusBadge status={w.status} />
                      </td>
                      <td className="py-3 px-4 text-neutral-500">
                        {w.lastTriggeredAt
                          ? formatUtcDateTime(w.lastTriggeredAt)
                          : "Never"}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600">
                        {w.successRate7d !== undefined
                          ? formatSuccessRate(w.successRate7d)
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={builderUrl}
                          className="font-medium text-heat-100 hover:underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={runsUrl}
                          className="font-medium text-neutral-500 hover:text-neutral-900"
                        >
                          History
                        </Link>
                        {onDeleteWorkflow && (
                          <button
                            type="button"
                            onClick={() => setWorkflowToDelete(w)}
                            className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors inline-block align-middle"
                            title="Delete workflow"
                            aria-label={`Delete ${w.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {workflowToDelete && (
        <DeleteWorkflowDialog
          open={Boolean(workflowToDelete)}
          workflowName={workflowToDelete.name}
          onConfirm={async () => {
            if (onDeleteWorkflow) {
              await onDeleteWorkflow(workflowToDelete.id);
            }
            setWorkflowToDelete(null);
          }}
          onCancel={() => setWorkflowToDelete(null)}
        />
      )}
    </div>
  );
}
