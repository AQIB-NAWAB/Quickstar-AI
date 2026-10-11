"use client";

import { ArrowUpRight,Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { EvaluationRun,RunStatus } from "../lib/types";

interface RunHistoryProps {
  workspaceId: string;
  runs: EvaluationRun[];
  isPreview?: boolean;
  isCompact?: boolean; // For overview page
  agentId?: string;
  onStartRunClick?: () => void;
}

export function RunHistory({
  workspaceId,
  runs,
  isPreview = false,
  isCompact = false,
  agentId,
  onStartRunClick,
}: RunHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const filteredRuns = runs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (agentId && r.agentId !== agentId) return false;
    return true;
  });

  const getStatusBadge = (status: RunStatus) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center rounded-md bg-[#22c55e]/10 px-2 py-0.5 text-[11px] font-medium text-[#16a34a]">
            Completed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center rounded-md bg-[#fa5d19]/10 px-2 py-0.5 text-[11px] font-medium text-[#fa5d19]">
            Running
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">
            Failed
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-[#737373]">
            Queued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-[#737373]">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#262626]">
            {isCompact ? "Recent runs" : "Evaluation runs"}
          </h2>
          {!isCompact && (
            <p className="text-xs text-[#737373] mt-0.5">
              Historical benchmark runs across versions and test datasets.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#ededed] bg-white px-2.5 py-1 text-xs font-medium text-[#737373] focus:border-[#fa5d19] focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>

          {!isCompact && onStartRunClick && (
            <button
              type="button"
              onClick={onStartRunClick}
              className="flex items-center gap-1 rounded-lg bg-[#fa5d19] px-3 py-1 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>Run evaluation</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#ededed] text-[11px] font-semibold text-[#737373]">
              <th className="pb-2.5 font-medium">Run</th>
              <th className="pb-2.5 font-medium">Version</th>
              <th className="pb-2.5 font-medium">Dataset</th>
              <th className="pb-2.5 font-medium">Score</th>
              <th className="pb-2.5 font-medium">Passed</th>
              <th className="pb-2.5 font-medium">Status</th>
              <th className="pb-2.5 font-medium">Started (UTC)</th>
              <th className="pb-2.5 text-right font-medium">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ededed]">
            {filteredRuns.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 text-center text-xs text-[#a3a3a3]"
                >
                  No evaluation runs found.
                </td>
              </tr>
            ) : (
              filteredRuns.map((r) => (
                <tr key={r.id} className="group hover:bg-[#f9f9f9]/50">
                  <td className="py-3 font-mono font-medium text-[#262626]">
                    <Link
                      href={`${basePath}/runs/${r.id}`}
                      className="hover:text-[#fa5d19] transition-colors"
                    >
                      {r.id}
                    </Link>
                  </td>
                  <td className="py-3 font-medium text-[#262626]">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                      {r.displayVersion}
                    </span>
                  </td>
                  <td className="py-3 text-[#262626]">
                    <span>{r.datasetName}</span>
                    <span className="text-[#a3a3a3] font-mono text-[11px] ml-1">
                      · rev {r.datasetRevision}
                    </span>
                  </td>
                  <td className="py-3 font-mono">
                    {r.overallScore !== null ? (
                      <span className="font-bold text-[#262626]">
                        {r.overallScore}{" "}
                        <span className="text-[#a3a3a3] font-normal">
                          /{r.scoreScale}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#a3a3a3]">—</span>
                    )}
                  </td>
                  <td className="py-3 font-mono">
                    {r.passedCount !== null ? (
                      <span className="font-semibold text-[#16a34a]">
                        {r.passedCount}
                        <span className="text-[#737373] font-normal">
                          /{r.totalCases}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#a3a3a3]">—</span>
                    )}
                  </td>
                  <td className="py-3">{getStatusBadge(r.status)}</td>
                  <td className="py-3 text-[#737373] font-mono text-[11px]">
                    {formatDate(r.startedAt)}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`${basePath}/runs/${r.id}`}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-[#262626] hover:text-[#fa5d19] transition-colors"
                    >
                      <span>View</span>
                      <ArrowUpRight className="h-3 w-3 text-[#a3a3a3] group-hover:text-[#fa5d19]" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-[#ededed]/60 flex items-center justify-between text-[11px] text-[#a3a3a3]">
        <span>
          {filteredRuns.length} {filteredRuns.length === 1 ? "run" : "runs"}{" "}
          {isPreview && "(sample runs)"}
        </span>
      </div>
    </div>
  );
}
