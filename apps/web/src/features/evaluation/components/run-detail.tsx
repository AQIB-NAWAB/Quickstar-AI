"use client";

import { AlertCircle,ArrowLeft,CheckCircle2,XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { EvaluationCaseResult,EvaluationRun } from "../lib/types";

interface RunDetailProps {
  workspaceId: string;
  run: EvaluationRun;
  results: EvaluationCaseResult[];
  isPreview?: boolean;
}

export function RunDetail({
  workspaceId,
  run,
  results,
  isPreview = false,
}: RunDetailProps) {
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("failed");
  // Default to the first failed case (e.g. Case 4 Return policy boundary) if exists, else first case
  const defaultCase =
    results.find((r) => r.outcome === "failed") || results[0];
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    defaultCase?.caseId || results[0]?.caseId || ""
  );

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const filteredResults = results.filter((r) => {
    if (filter === "passed") return r.outcome === "passed";
    if (filter === "failed") return r.outcome === "failed";
    return true;
  });

  const activeResult =
    results.find((r) => r.caseId === selectedCaseId) || filteredResults[0] || results[0];

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ededed] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`${basePath}/runs`}
            className="rounded-lg border border-[#ededed] p-1.5 text-[#737373] hover:text-[#262626] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#262626]">
                Run results · {run.id}
              </h1>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  run.status === "completed"
                    ? "bg-[#22c55e]/10 text-[#16a34a]"
                    : run.status === "failed"
                    ? "bg-red-100 text-red-600"
                    : "bg-[#fa5d19]/10 text-[#fa5d19]"
                }`}
              >
                {run.status.toUpperCase()}
              </span>
            </div>
            <p className="font-mono text-xs text-[#a3a3a3] mt-0.5">
              /eval/runs/{run.id}
            </p>
          </div>
        </div>

        {/* Run Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-[#737373]">
            Version: <strong className="text-[#262626]">{run.displayVersion}</strong>
          </div>
          <div className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-[#737373]">
            Dataset: <strong className="text-[#262626]">{run.datasetName}</strong> (rev {run.datasetRevision})
          </div>
          <div className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-[#737373]">
            Score:{" "}
            <strong className="text-[#262626]">
              {run.overallScore ?? "—"}/{run.scoreScale}
            </strong>
          </div>
        </div>
      </div>

      {/* Summary Score Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#ededed] bg-white p-4">
          <span className="text-xs font-medium text-[#737373]">Overall score</span>
          <div className="text-2xl font-extrabold text-[#262626] mt-1 font-mono">
            {run.overallScore ?? "—"}
            <span className="text-xs font-normal text-[#a3a3a3]"> /{run.scoreScale}</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#ededed] bg-white p-4">
          <span className="text-xs font-medium text-[#737373]">Passed cases</span>
          <div className="text-2xl font-extrabold text-[#16a34a] mt-1 font-mono">
            {run.passedCount ?? 0}
            <span className="text-xs font-normal text-[#737373]"> /{run.totalCases}</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#ededed] bg-white p-4">
          <span className="text-xs font-medium text-[#737373]">Failed cases</span>
          <div className="text-2xl font-extrabold text-red-600 mt-1 font-mono">
            {run.failedCount ?? 0}
            <span className="text-xs font-normal text-[#737373]"> /{run.totalCases}</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#ededed] bg-white p-4">
          <span className="text-xs font-medium text-[#737373]">Started (UTC)</span>
          <div className="text-xs font-semibold text-[#262626] mt-2 font-mono">
            {formatDate(run.startedAt)}
          </div>
        </div>
      </div>

      {/* Main Diagnostic Board - Matching Lower Right of Approved Image */}
      {activeResult && (
        <div className="rounded-xl border border-[#ededed] bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#ededed] pb-3">
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  activeResult.outcome === "passed"
                    ? "bg-[#22c55e]/15 text-[#16a34a]"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {activeResult.outcome === "passed" ? "Passed" : "Failed"}
              </span>
              <h2 className="text-base font-bold text-[#262626]">
                {activeResult.caseName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "passed" | "failed")}
                className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              >
                <option value="failed">Failed cases</option>
                <option value="all">All cases</option>
                <option value="passed">Passed cases</option>
              </select>
            </div>
          </div>

          {/* 3 Text Columns: Input | Expected Output | Actual Output */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#737373]">
                Input
              </label>
              <div className="min-h-[90px] rounded-lg border border-[#ededed] bg-[#f9f9f9]/60 p-3 text-xs text-[#262626]">
                {activeResult.input}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#737373]">
                Expected output
              </label>
              <div className="min-h-[90px] rounded-lg border border-[#ededed] bg-[#f9f9f9]/60 p-3 text-xs text-[#262626]">
                {activeResult.expectedOutput || "—"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#737373]">
                Actual output
              </label>
              <div className="min-h-[90px] rounded-lg border border-[#ededed] bg-[#f9f9f9]/60 p-3 text-xs text-[#262626]">
                {activeResult.actualOutput || (
                  <span className="text-[#a3a3a3] italic">
                    No output recorded.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Tools & Diagnostic Callout Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
            {/* Tools comparison */}
            <div className="lg:col-span-5 space-y-3 rounded-lg border border-[#ededed] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#737373]">Expected tools</span>
                <div className="flex flex-wrap gap-1">
                  {activeResult.expectedTools.length > 0 ? (
                    activeResult.expectedTools.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-[#262626]"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#a3a3a3]">None</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-[#737373]">Actual tools</span>
                <div className="flex flex-wrap gap-1">
                  {activeResult.actualTools.length > 0 ? (
                    activeResult.actualTools.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-[#262626]"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#a3a3a3]">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnostic Alert & Score */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-2">
              {activeResult.failureReasons && activeResult.failureReasons.length > 0 ? (
                <div className="rounded-lg bg-red-50 border border-red-200/80 p-3 text-xs text-red-700">
                  <div className="font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span>{activeResult.failureReasons.join(". ")}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-green-50 border border-green-200/80 p-3 text-xs text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span>Output and tool requirements matched criteria.</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-medium text-[#737373] px-1">
                <span>
                  Case score:{" "}
                  <strong className="text-[#262626] font-mono">
                    {activeResult.score} /{activeResult.scoreScale}
                  </strong>
                </span>
                <span>
                  Outcome:{" "}
                  <strong
                    className={
                      activeResult.outcome === "passed"
                        ? "text-[#16a34a]"
                        : "text-red-600"
                    }
                  >
                    {activeResult.outcome === "passed" ? "Passed" : "Failed"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Selector Grid/Table */}
      <div className="rounded-xl border border-[#ededed] bg-white p-5 space-y-3 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
          All Cases in Run ({filteredResults.length})
        </h3>
        <div className="divide-y divide-[#ededed]">
          {filteredResults.map((res) => {
            const isSelected = res.caseId === selectedCaseId;
            return (
              <button
                key={res.caseId}
                type="button"
                onClick={() => setSelectedCaseId(res.caseId)}
                className={`w-full text-left py-2.5 px-3 flex items-center justify-between transition-colors rounded-lg ${
                  isSelected
                    ? "bg-[#fa5d19]/5 border border-[#fa5d19]"
                    : "hover:bg-[#f9f9f9]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {res.outcome === "passed" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-[#262626]">
                      {res.caseName}
                    </span>
                    <span className="text-[11px] text-[#737373] ml-2 line-clamp-1 hidden sm:inline">
                      {res.input}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span
                    className={
                      res.outcome === "passed"
                        ? "text-[#16a34a] font-bold"
                        : "text-red-600 font-bold"
                    }
                  >
                    {res.score}/{res.scoreScale}
                  </span>
                  <span className="text-[#a3a3a3] text-[11px]">Inspect</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
