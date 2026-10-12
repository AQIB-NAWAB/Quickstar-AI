"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration,formatUtcDateTime } from "../lib/format";
import type { WorkflowRun } from "../lib/types";
import { RunDetails } from "./run-details";
import { RunStatusBadge } from "./run-status-badge";

interface ExecutionHistoryProps {
  runs: WorkflowRun[];
  runsBaseUrl: string;
  isRecent?: boolean;
  onViewAll?: () => void;
  initialSelectedRunId?: string | null;
}

export function ExecutionHistory({
  runs,
  runsBaseUrl,
  isRecent = false,
  onViewAll,
  initialSelectedRunId = null,
}: ExecutionHistoryProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialSelectedRunId);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredRuns = runs.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  return (
    <div className="space-y-3">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            {isRecent ? "Recent executions" : "Execution history"}
          </h3>
          {isRecent && (
            <p className="text-[11px] text-neutral-400">
              Sample runs shown for design preview.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border-faint rounded-6 bg-white text-neutral-700 hover:border-neutral-300 focus:outline-none focus:border-heat-100"
              aria-label="Filter runs by status"
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
              <option value="running">Running</option>
            </select>
          </div>

          {/* View All link */}
          {isRecent && (
            onViewAll ? (
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs font-semibold text-heat-100 hover:underline"
              >
                View all
              </button>
            ) : (
              <Link
                href={runsBaseUrl}
                className="text-xs font-semibold text-heat-100 hover:underline"
              >
                View all
              </Link>
            )
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-faint bg-neutral-50/50 text-neutral-400 font-medium">
                <th className="py-2.5 px-4 font-medium">Run</th>
                <th className="py-2.5 px-4 font-medium">Triggered</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Duration</th>
                <th className="py-2.5 px-4 font-medium">Steps</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 italic">
                    No execution runs found.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const isRowSelected = run.id === selectedRunId;

                  // Format step display
                  let stepsText = `${run.completedSteps} / ${run.totalSteps}`;
                  if (run.status === "skipped") {
                    stepsText = "Condition not matched";
                  }

                  return (
                    <tr
                      key={run.id}
                      className={`transition-colors cursor-pointer ${
                        isRowSelected
                          ? "bg-orange-50/50 font-medium"
                          : "hover:bg-neutral-50/80"
                      }`}
                      onClick={() =>
                        setSelectedRunId(isRowSelected ? null : run.id)
                      }
                    >
                      <td className="py-3 px-4 font-mono font-medium text-accent-black">
                        {run.id}
                      </td>
                      <td className="py-3 px-4 text-neutral-500">
                        {formatUtcDateTime(run.triggeredAt)}
                      </td>
                      <td className="py-3 px-4">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono">
                        {formatDuration(run.durationMs)}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {stepsText}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRunId(isRowSelected ? null : run.id);
                          }}
                          className="font-medium text-heat-100 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {isRecent && filteredRuns.length > 0 && (
          <div className="px-4 py-2 bg-neutral-50/40 border-t border-border-faint text-[11px] text-neutral-400">
            Showing 1&ndash;{filteredRuns.length} sample executions
          </div>
        )}
      </div>

      {/* Inline Run Details when expanded */}
      {selectedRun && (
        <RunDetails
          run={selectedRun}
          isInline
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </div>
  );
}
