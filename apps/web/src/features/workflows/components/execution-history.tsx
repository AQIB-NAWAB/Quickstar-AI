"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Zap,
  TrendingUp,
  Filter,
} from "lucide-react";
import { formatDuration, formatUtcDateTime } from "../lib/format";
import type { WorkflowRun } from "../lib/types";
import { RunDetails } from "./run-details";
import { RunStatusBadge } from "./run-status-badge";

export interface ExecutionHistoryProps {
  runs: WorkflowRun[];
  runsBaseUrl: string;
  isRecent?: boolean;
  onViewAll?: () => void;
  initialSelectedRunId?: string | null;
  onReplayRun?: (run: WorkflowRun) => void;
  onCancelRun?: (runId: string) => void;
}

export function ExecutionHistory({
  runs,
  runsBaseUrl,
  isRecent = false,
  onViewAll,
  initialSelectedRunId = null,
  onReplayRun,
  onCancelRun,
}: ExecutionHistoryProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialSelectedRunId);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Derive stats
  const totalRuns = runs.length;
  const succeededCount = runs.filter((r) => r.status === "succeeded").length;
  const failedCount = runs.filter((r) => r.status === "failed").length;
  const skippedCount = runs.filter((r) => r.status === "skipped").length;
  const avgDuration =
    runs.length > 0
      ? Math.round(
          runs.reduce((acc, r) => acc + (r.durationMs ?? 15), 0) / runs.length,
        )
      : 0;

  const filteredRuns = runs.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      (r.workflowName && r.workflowName.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  return (
    <div className="space-y-5">
      {/* 5 KPI Summary Cards (matches Design Ref 3) */}
      {!isRecent && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-neutral-500 block">Total Runs (7d)</span>
            <span className="text-xl font-extrabold text-neutral-900 block">{totalRuns}</span>
            <span className="text-[10px] text-neutral-400">Recorded executions</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 block">Succeeded</span>
            <span className="text-xl font-extrabold text-emerald-600 block">{succeededCount}</span>
            <span className="text-[10px] text-neutral-400">All steps passed</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-rose-700 block">Failed</span>
            <span className="text-xl font-extrabold text-rose-600 block">{failedCount}</span>
            <span className="text-[10px] text-neutral-400">Unhandled failures</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-neutral-600 block">Skipped</span>
            <span className="text-xl font-extrabold text-neutral-700 block">{skippedCount}</span>
            <span className="text-[10px] text-neutral-400">Condition not matched</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-blue-700 block">Avg Duration</span>
            <span className="text-xl font-extrabold text-blue-600 block">{avgDuration}ms</span>
            <span className="text-[10px] text-neutral-400">Sub-second execution</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search run ID or conversation ID..."
            className="w-full pl-9 pr-3 py-1.5 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-medium">
            {(["all", "succeeded", "failed", "running", "skipped"] as const).map((s) => (
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

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold"
            >
              View Full History
            </button>
          )}
        </div>
      </div>

      {/* Selected Run Details Drawer */}
      {selectedRun && (
        <RunDetails
          run={selectedRun}
          onClose={() => setSelectedRunId(null)}
          onReplay={onReplayRun}
          onCancelRun={onCancelRun}
        />
      )}

      {/* Runs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold text-[11px]">
              <th className="py-3 px-4">Run ID</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Steps Completed</th>
              <th className="py-3 px-4">Triggered At</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredRuns.map((run) => (
              <tr
                key={run.id}
                onClick={() => setSelectedRunId(run.id)}
                className={`hover:bg-neutral-50/80 cursor-pointer transition-colors ${
                  selectedRunId === run.id ? "bg-orange-50/40" : ""
                }`}
              >
                <td className="py-3.5 px-4">
                  <span className="font-mono text-xs font-bold text-neutral-900 block">{run.id}</span>
                  {run.definitionVersion && (
                    <span className="font-mono text-[10px] text-neutral-400">
                      v{run.definitionVersion}
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <RunStatusBadge status={run.status} />
                </td>

                <td className="py-3.5 px-4 text-neutral-700 font-medium">
                  {run.completedSteps} / {run.totalSteps} steps
                  {run.stepsSummary && (
                    <span className="text-[11px] text-neutral-400 block truncate max-w-[200px]">
                      {run.stepsSummary}
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4 text-neutral-500 text-[11px]">
                  {formatUtcDateTime(run.triggeredAt)}
                </td>

                <td className="py-3.5 px-4 text-neutral-600 font-mono text-[11px]">
                  {run.durationMs !== null && run.durationMs !== undefined
                    ? formatDuration(run.durationMs)
                    : "—"}
                </td>

                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {onReplayRun && (
                      <button
                        onClick={() => onReplayRun(run)}
                        className="p-1.5 text-neutral-400 hover:text-[#FA5D19] hover:bg-orange-50 rounded-lg transition-colors"
                        title="Replay event payload"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRunId(run.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredRuns.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 text-xs">
                  No workflow executions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
