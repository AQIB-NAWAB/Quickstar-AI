"use client";

import { Database,Info,Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { EvaluationOverviewData,EvaluationRun } from "../lib/types";
import { DatasetList } from "./dataset-list";
import { RunHistory } from "./run-history";
import { StartEvaluationDialog } from "./start-evaluation-dialog";
import { VersionScoreComparison } from "./version-score-comparison";

interface AgentEvaluationPageProps {
  workspaceId: string;
  agentId: string;
  initialData: EvaluationOverviewData;
  isPreview?: boolean;
  onStartRun?: (data: { versionId: string; datasetId: string }) => Promise<EvaluationRun>;
}

export function AgentEvaluationPage({
  workspaceId,
  initialData,
  isPreview = false,
  onStartRun,
}: AgentEvaluationPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "datasets" | "runs">("overview");
  const [overviewData, setOverviewData] = useState<EvaluationOverviewData>(initialData);
  const [isStartRunOpen, setIsStartRunOpen] = useState(false);

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const handleStartRun = async (data: { versionId: string; datasetId: string }) => {
    if (onStartRun) {
      const run = await onStartRun(data);
      // Prepend to recent runs in local state
      setOverviewData((prev) => ({
        ...prev,
        recentRuns: [run, ...prev.recentRuns],
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ededed] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#262626]">
              Agent evaluation
            </h1>
            {isPreview && (
              <span className="rounded bg-[#fa5d19]/10 px-2 py-0.5 text-[11px] font-medium text-[#fa5d19]">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Evaluate published versions against a fixed test dataset.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`${basePath}/datasets`}
            className="flex items-center gap-1.5 rounded-lg border border-[#ededed] bg-white px-3.5 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#f9f9f9] transition-colors"
          >
            <Database className="h-3.5 w-3.5 text-[#737373]" />
            <span>Manage datasets</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsStartRunOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Run evaluation</span>
          </button>
        </div>
      </div>

      {/* Context Row */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#ededed] bg-white px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#737373]">Agent</span>
          <select
            defaultValue={overviewData.agentId}
            className="rounded-md border border-[#ededed] bg-white px-2.5 py-1 font-medium text-[#262626] focus:border-[#fa5d19] focus:outline-none"
          >
            <option value={overviewData.agentId}>
              {overviewData.agentName}
            </option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#737373]">Dataset</span>
          <select
            defaultValue={overviewData.selectedDataset.id}
            className="rounded-md border border-[#ededed] bg-white px-2.5 py-1 font-medium text-[#262626] focus:border-[#fa5d19] focus:outline-none"
          >
            {overviewData.datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · revision {d.revision}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[#737373] ml-auto">
          Scoring policy:{" "}
          <span className="font-mono font-medium text-[#262626]">
            {overviewData.scoringPolicy || "Not specified"}
          </span>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="border-b border-[#ededed]">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative ${
              activeTab === "overview"
                ? "text-[#fa5d19] border-b-2 border-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("datasets")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative ${
              activeTab === "datasets"
                ? "text-[#fa5d19] border-b-2 border-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Datasets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("runs")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative ${
              activeTab === "runs"
                ? "text-[#fa5d19] border-b-2 border-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Runs
          </button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Latest overall score */}
            <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#737373]">
                <span>Latest overall score</span>
                <Info className="h-3 w-3 text-[#a3a3a3]" />
              </div>
              <div className="pt-1">
                <span className="text-3xl font-extrabold text-[#262626] font-mono">
                  {overviewData.latestScore ?? "—"}
                </span>
                <span className="text-sm font-medium text-[#a3a3a3] font-mono">
                  {" "}/{overviewData.scoreScale}
                </span>
              </div>
            </div>

            {/* Card 2: Passed cases */}
            <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#737373]">
                Passed cases
              </div>
              <div className="pt-1">
                <span className="text-3xl font-extrabold text-[#16a34a] font-mono">
                  {overviewData.passedCases ?? "—"}
                </span>
                <span className="text-sm font-medium text-[#737373] font-mono">
                  {" "}/{overviewData.totalCases}
                </span>
              </div>
            </div>

            {/* Card 3: Failed cases */}
            <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#737373]">
                Failed cases
              </div>
              <div className="pt-1">
                <span className="text-3xl font-extrabold text-red-600 font-mono">
                  {overviewData.failedCases ?? "—"}
                </span>
                <span className="text-sm font-medium text-[#737373] font-mono">
                  {" "}/{overviewData.totalCases}
                </span>
              </div>
            </div>

            {/* Card 4: Latest run */}
            <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-1 shadow-xs">
              <div className="text-xs font-medium text-[#737373]">
                Latest run
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-2xl font-extrabold text-[#262626] font-mono">
                  {overviewData.latestRun?.displayVersion || "v8"}
                </span>
                <span className="inline-flex items-center rounded-md bg-[#22c55e]/10 px-2 py-0.5 text-[11px] font-medium text-[#16a34a]">
                  Completed
                </span>
              </div>
              <p className="text-[11px] text-[#a3a3a3] font-mono truncate">
                {overviewData.latestRun
                  ? `${overviewData.latestRun.id} · ${overviewData.latestRun.datasetName} rev${overviewData.latestRun.datasetRevision}`
                  : "run_2048 · Support basics rev2"}
              </p>
            </div>
          </div>

          {/* Two-Column Grid: Comparison Chart & Datasets Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <VersionScoreComparison
              points={overviewData.comparison}
              datasetName={overviewData.selectedDataset.name}
              datasetRevision={overviewData.selectedDataset.revision}
              scoringPolicy={overviewData.scoringPolicy}
            />

            <DatasetList
              workspaceId={workspaceId}
              datasets={overviewData.datasets}
              isPreview={isPreview}
              isCompact={true}
            />
          </div>

          {/* Recent Runs Table */}
          <RunHistory
            workspaceId={workspaceId}
            runs={overviewData.recentRuns}
            isPreview={isPreview}
            isCompact={true}
            onStartRunClick={() => setIsStartRunOpen(true)}
          />
        </div>
      )}

      {activeTab === "datasets" && (
        <DatasetList
          workspaceId={workspaceId}
          datasets={overviewData.datasets}
          isPreview={isPreview}
          isCompact={false}
        />
      )}

      {activeTab === "runs" && (
        <RunHistory
          workspaceId={workspaceId}
          runs={overviewData.recentRuns}
          isPreview={isPreview}
          isCompact={false}
          onStartRunClick={() => setIsStartRunOpen(true)}
        />
      )}

      {/* Start Evaluation Modal */}
      <StartEvaluationDialog
        isOpen={isStartRunOpen}
        onClose={() => setIsStartRunOpen(false)}
        datasets={overviewData.datasets}
        onStart={handleStartRun}
      />
    </div>
  );
}
