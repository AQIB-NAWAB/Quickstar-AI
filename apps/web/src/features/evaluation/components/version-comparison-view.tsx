"use client";

import { AlertCircle, AlertTriangle, Eye, GitCompare, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EvaluationApiClient } from "../lib/api-repository";
import type { ComparisonCategoryItem, EvaluationComparison, EvaluationRun } from "../lib/types";

interface VersionComparisonViewProps {
  workspaceId: string;
  initialRuns: EvaluationRun[];
  initialComparison?: EvaluationComparison | null;
  defaultBaselineId?: string;
  defaultCandidateId?: string;
  isPreview?: boolean;
}

export function VersionComparisonView({
  workspaceId,
  initialRuns,
  initialComparison = null,
  defaultBaselineId,
  defaultCandidateId,
  isPreview = false,
}: VersionComparisonViewProps) {
  const completedRuns = initialRuns.filter((r) => r.status === "completed" || (r.passedCount ?? 0) > 0);

  const [baselineId, setBaselineId] = useState<string>(
    defaultBaselineId || completedRuns[1]?.id || completedRuns[0]?.id || "",
  );
  const [candidateId, setCandidateId] = useState<string>(
    defaultCandidateId || completedRuns[0]?.id || "",
  );
  const [comparison, setComparison] = useState<EvaluationComparison | null>(initialComparison);
  const [activeTab, setActiveTab] = useState<"regressed" | "fixed" | "unchangedPassed" | "unchangedFailed">("regressed");
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Diff Modal state
  const [diffCase, setDiffCase] = useState<ComparisonCategoryItem | null>(null);

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const handleRunComparison = async (bId = baselineId, cId = candidateId) => {
    if (!bId || !cId) {
      setError("Please select both a baseline run and candidate run to compare.");
      return;
    }
    if (bId === cId) {
      setError("Please select two distinct runs to calculate deltas and regressions.");
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const res = await EvaluationApiClient.createComparison(workspaceId, {
        baselineRunId: bId,
        candidateRunId: cId,
      });

      if (!res.ok) {
        setError(res.error);
        setIsComparing(false);
        return;
      }

      setComparison(res.data.comparison);
      // Auto-select tab with regressions if any, else fixed
      if (res.data.comparison.regressedCount > 0) {
        setActiveTab("regressed");
      } else if (res.data.comparison.fixedCount > 0) {
        setActiveTab("fixed");
      } else {
        setActiveTab("unchangedPassed");
      }
      setIsComparing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate comparison");
      setIsComparing(false);
    }
  };

  useEffect(() => {
    if (!comparison && baselineId && candidateId && baselineId !== candidateId) {
      handleRunComparison(baselineId, candidateId);
    }
  }, [baselineId, candidateId]);

  const activeCategoryList = comparison
    ? comparison.categories[activeTab] || []
    : [];

  const baselineRun = initialRuns.find((r) => r.id === baselineId);
  const candidateRun = initialRuns.find((r) => r.id === candidateId);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs matching Image 7 */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] pb-px text-xs font-semibold">
        <Link
          href={`${basePath}/datasets`}
          className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-[#71717A] hover:border-[#DCE1E8] hover:text-[#18181B] transition-colors"
        >
          <span>Datasets</span>
        </Link>
        <Link
          href={`${basePath}/runs`}
          className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-[#71717A] hover:border-[#DCE1E8] hover:text-[#18181B] transition-colors"
        >
          <span>Evaluation Runs</span>
        </Link>
        <Link
          href={`${basePath}/compare`}
          className="flex items-center gap-2 border-b-2 border-[#FF571A] px-4 py-2.5 text-[#FF571A]"
        >
          <span>Version Comparisons</span>
          <span className="rounded-full bg-[#FF571A]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF571A]">
            Active
          </span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#18181B]">
            Version Score Comparison
          </h1>
          <p className="text-xs text-[#71717A] mt-1">
            Compare pass rates, token latency, and test case regressions between two evaluation runs.
          </p>
        </div>
      </div>

      {/* Selectors Bar matching Image 7 */}
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Baseline Run Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-[#71717A] flex items-center justify-between">
              <span>Baseline Run (Previous Version)</span>
              {baselineRun && (
                <span className="font-mono text-[11px] text-[#18181B]">
                  {baselineRun.score != null ? `${baselineRun.score.toFixed(1)}%` : ""}
                </span>
              )}
            </label>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value)}
              className="w-full rounded-lg border border-[#DCE1E8] bg-white px-3 py-2 text-xs font-medium text-[#18181B] focus:border-[#FF571A] focus:outline-none"
            >
              <option value="">-- Select Baseline Run --</option>
              {completedRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id.slice(0, 8)} · {r.agentName} {r.displayVersion || (r.agentVersionId ? `v${r.agentVersionId.slice(0, 4)}` : "v1.0")} ({r.passedCount ?? 0}/{r.caseCount ?? 0} passed)
                </option>
              ))}
            </select>
          </div>

          {/* VS Divider */}
          <div className="md:col-span-1 flex items-center justify-center pb-2 text-[#71717A] font-bold text-xs">
            VS
          </div>

          {/* Candidate Run Selector */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-[#71717A] flex items-center justify-between">
              <span>Candidate Run (New Version)</span>
              {candidateRun && (
                <span className="font-mono text-[11px] text-[#FF571A] font-bold">
                  {candidateRun.score != null ? `${candidateRun.score.toFixed(1)}%` : ""}
                </span>
              )}
            </label>
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="w-full rounded-lg border border-[#DCE1E8] bg-white px-3 py-2 text-xs font-medium text-[#18181B] focus:border-[#FF571A] focus:outline-none"
            >
              <option value="">-- Select Candidate Run --</option>
              {completedRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id.slice(0, 8)} · {r.agentName} {r.displayVersion || (r.agentVersionId ? `v${r.agentVersionId.slice(0, 4)}` : "v1.0")} ({r.passedCount ?? 0}/{r.caseCount ?? 0} passed)
                </option>
              ))}
            </select>
          </div>

          {/* Compare Button */}
          <div className="md:col-span-2">
            <button
              type="button"
              disabled={isComparing || !baselineId || !candidateId}
              onClick={() => handleRunComparison()}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#FF571A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#E0460D] transition-colors disabled:opacity-50"
            >
              {isComparing ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Comparing...</span>
                </>
              ) : (
                <>
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Compare</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-[#FEF3F2] border border-[#FEE4E2] p-3 text-xs text-[#B42318] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Delta KPI Cards matching Image 7 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pass Rate Delta */}
            <div className="rounded-xl border border-[#EAECF0] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#71717A]">Pass Rate Delta</div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono ${
                    comparison.deltaPercentagePoints >= 0 ? "text-[#027A48]" : "text-[#B42318]"
                  }`}
                >
                  {comparison.deltaPercentagePoints >= 0 ? "+" : ""}
                  {comparison.deltaPercentagePoints.toFixed(1)}%
                </span>
                <span className="text-[11px] text-[#71717A] font-mono">
                  {(comparison.baselinePassRate * 100).toFixed(1)}% → {(comparison.candidatePassRate * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-[#71717A]">
                {comparison.deltaPercentagePoints >= 0 ? "Improvement over baseline" : "Regression over baseline"}
              </p>
            </div>

            {/* Latency Delta */}
            <div className="rounded-xl border border-[#EAECF0] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#71717A]">Latency Delta</div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono ${
                    (comparison.latencyDeltaMs ?? 0) <= 0 ? "text-[#027A48]" : "text-[#B42318]"
                  }`}
                >
                  {comparison.latencyDeltaMs != null
                    ? `${comparison.latencyDeltaMs > 0 ? "+" : ""}${comparison.latencyDeltaMs}ms`
                    : "—"}
                </span>
              </div>
              <p className="text-[11px] text-[#71717A]">Average turn response time</p>
            </div>

            {/* Regressions Flagged */}
            <div className="rounded-xl border border-[#EAECF0] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#71717A]">Regressions Flagged</div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono ${
                    comparison.regressedCount > 0 ? "text-[#B42318]" : "text-[#027A48]"
                  }`}
                >
                  {comparison.regressedCount}
                </span>
                <span className="text-xs text-[#71717A]">
                  {comparison.regressedCount === 1 ? "case regressed" : "cases regressed"}
                </span>
              </div>
              <p className="text-[11px] text-[#71717A]">Passed in baseline, failed in candidate</p>
            </div>

            {/* Improvements Fixed */}
            <div className="rounded-xl border border-[#EAECF0] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#71717A]">Improvements / Fixed</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#027A48]">
                  {comparison.fixedCount}
                </span>
                <span className="text-xs text-[#71717A]">
                  {comparison.fixedCount === 1 ? "case fixed" : "cases fixed"}
                </span>
              </div>
              <p className="text-[11px] text-[#71717A]">Failed in baseline, passed in candidate</p>
            </div>
          </div>

          {/* Regression Warning Banner matching Image 7 */}
          {comparison.regressedCount > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-xs text-[#B42318] shadow-xs">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">
                  {comparison.regressedCount} Regression{comparison.regressedCount > 1 ? "s" : ""} Flagged
                </h4>
                <p className="text-xs mt-1 leading-relaxed text-[#912018]">
                  {comparison.regressedCount} test case{comparison.regressedCount > 1 ? "s" : ""} that previously passed in the baseline run failed in this candidate version. Review the diffs below before deploying to production.
                </p>
              </div>
            </div>
          )}

          {/* Category Breakdown Tabs */}
          <div className="rounded-xl border border-[#EAECF0] bg-white shadow-xs overflow-hidden">
            <div className="flex items-center gap-1 border-b border-[#EAECF0] px-4 pt-3 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("regressed")}
                className={`flex items-center gap-2 border-b-2 px-3 pb-3 transition-colors ${
                  activeTab === "regressed"
                    ? "border-[#B42318] text-[#B42318]"
                    : "border-transparent text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                <span>Regressions</span>
                <span className="rounded-full bg-[#FEF3F2] px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
                  {comparison.regressedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("fixed")}
                className={`flex items-center gap-2 border-b-2 px-3 pb-3 transition-colors ${
                  activeTab === "fixed"
                    ? "border-[#027A48] text-[#027A48]"
                    : "border-transparent text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                <span>Fixed / Improvements</span>
                <span className="rounded-full bg-[#E9F9EF] px-2 py-0.5 text-[10px] font-bold text-[#027A48]">
                  {comparison.fixedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unchangedPassed")}
                className={`flex items-center gap-2 border-b-2 px-3 pb-3 transition-colors ${
                  activeTab === "unchangedPassed"
                    ? "border-[#18181B] text-[#18181B]"
                    : "border-transparent text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                <span>Unchanged Passed</span>
                <span className="rounded-full bg-[#F1F3F5] px-2 py-0.5 text-[10px] font-bold text-[#71717A]">
                  {comparison.unchangedPassedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unchangedFailed")}
                className={`flex items-center gap-2 border-b-2 px-3 pb-3 transition-colors ${
                  activeTab === "unchangedFailed"
                    ? "border-[#18181B] text-[#18181B]"
                    : "border-transparent text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                <span>Unchanged Failed</span>
                <span className="rounded-full bg-[#F1F3F5] px-2 py-0.5 text-[10px] font-bold text-[#71717A]">
                  {comparison.unchangedFailedCount}
                </span>
              </button>
            </div>

            {/* Matched Cases Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FB] border-b border-[#EAECF0] text-[11px] font-semibold text-[#71717A]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Test Case</th>
                    <th className="px-5 py-3 font-semibold">Baseline Result</th>
                    <th className="px-5 py-3 font-semibold">Candidate Result</th>
                    <th className="px-5 py-3 font-semibold">Classification</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {activeCategoryList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-xs text-[#71717A]">
                        No test cases in this category.
                      </td>
                    </tr>
                  ) : (
                    activeCategoryList.map((item) => (
                      <tr key={item.caseId} className="hover:bg-[#F8F9FB]/60 transition-colors">
                        <td className="px-5 py-3 font-semibold text-[#18181B]">
                          {item.caseName}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              item.baselinePassed
                                ? "bg-[#E9F9EF] text-[#027A48]"
                                : "bg-[#FEF3F2] text-[#B42318]"
                            }`}
                          >
                            {item.baselinePassed ? "PASSED" : "FAILED"}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              item.candidatePassed
                                ? "bg-[#E9F9EF] text-[#027A48]"
                                : "bg-[#FEF3F2] text-[#B42318]"
                            }`}
                          >
                            {item.candidatePassed ? "PASSED" : "FAILED"}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              item.status === "regressed"
                                ? "bg-[#FEF3F2] text-[#B42318]"
                                : item.status === "fixed"
                                ? "bg-[#E9F9EF] text-[#027A48]"
                                : "bg-[#F1F3F5] text-[#71717A]"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDiffCase(item)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#F1F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#EAECF0] transition-colors"
                          >
                            <Eye className="h-3 w-3 text-[#71717A]" />
                            <span>View Diff</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Diff Modal */}
      {diffCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Case diff modal"
            className="w-full max-w-2xl rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#18181B]">
                  Case Diff · {diffCase.caseName}
                </h3>
                <span className="font-mono text-[11px] text-[#71717A]">
                  ID: {diffCase.caseId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDiffCase(null)}
                className="text-[#71717A] hover:text-[#18181B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Expected Ground Truth */}
            {diffCase.expectedOutput && (
              <div className="rounded-xl border border-[#EAECF0] bg-[#F8F9FB] p-3 space-y-1">
                <span className="text-xs font-semibold text-[#027A48]">
                  Expected Response (Ground Truth)
                </span>
                <div className="rounded bg-white border border-[#EAECF0] p-2.5 text-xs text-[#18181B]">
                  {diffCase.expectedOutput}
                </div>
              </div>
            )}

            {/* Side by Side Baseline vs Candidate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Baseline Output */}
              <div className="rounded-xl border border-[#EAECF0] bg-[#F8F9FB] p-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#71717A]">Baseline Model Output</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      diffCase.baselinePassed
                        ? "bg-[#E9F9EF] text-[#027A48]"
                        : "bg-[#FEF3F2] text-[#B42318]"
                    }`}
                  >
                    {diffCase.baselinePassed ? "PASSED" : "FAILED"}
                  </span>
                </div>
                <div className="min-h-[100px] rounded bg-white border border-[#EAECF0] p-2.5 text-xs text-[#18181B]">
                  {diffCase.baselineOutput || <span className="text-[#A1A1AA] italic">No output</span>}
                </div>
              </div>

              {/* Candidate Output */}
              <div className="rounded-xl border border-[#EAECF0] bg-[#F8F9FB] p-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#FF571A]">Candidate Model Output</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      diffCase.candidatePassed
                        ? "bg-[#E9F9EF] text-[#027A48]"
                        : "bg-[#FEF3F2] text-[#B42318]"
                    }`}
                  >
                    {diffCase.candidatePassed ? "PASSED" : "FAILED"}
                  </span>
                </div>
                <div className="min-h-[100px] rounded bg-white border border-[#EAECF0] p-2.5 text-xs text-[#18181B]">
                  {diffCase.candidateOutput || <span className="text-[#A1A1AA] italic">No output</span>}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => setDiffCase(null)}
                className="rounded-lg bg-[#F1F3F5] px-4 py-1.5 text-xs font-semibold text-[#18181B] hover:bg-[#EAECF0]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
