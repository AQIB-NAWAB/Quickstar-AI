"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ChevronRight,
  Shield,
  FileCode,
} from "lucide-react";
import type { WorkflowRun, StepRun } from "../lib/types";
import { formatDuration, formatUtcDateTime } from "../lib/format";
import { RunStatusBadge } from "./run-status-badge";

export interface RunDetailsProps {
  run: WorkflowRun;
  onClose?: () => void;
  onReplay?: (run: WorkflowRun) => void;
  onCancelRun?: (runId: string) => void;
  isInline?: boolean;
}

export function RunDetails({
  run,
  onClose,
  onReplay,
  onCancelRun,
  isInline = false,
}: RunDetailsProps) {
  const failedStep = run.stepRuns.find((s) => s.status === "failed");
  const [selectedStepId, setSelectedStepId] = useState<string>(
    failedStep ? failedStep.stepId : run.stepRuns[0]?.stepId || "",
  );
  const [activeTab, setActiveTab] = useState<"outputs" | "inputs" | "error">("outputs");
  const [copied, setCopied] = useState(false);

  const selectedStep: StepRun | undefined =
    run.stepRuns.find((s) => s.stepId === selectedStepId) || run.stepRuns[0];

  const handleCopy = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`bg-white border border-neutral-200 rounded-2xl p-5 shadow-lg space-y-4 text-xs text-neutral-800 ${
        isInline ? "mt-4" : ""
      }`}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-neutral-900">{run.id}</span>
              <RunStatusBadge status={run.status} />
              {run.definitionVersion && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold border border-neutral-200">
                  v{run.definitionVersion}
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Triggered {formatUtcDateTime(run.triggeredAt)} • Duration:{" "}
              {run.durationMs !== null && run.durationMs !== undefined
                ? formatDuration(run.durationMs)
                : "In progress"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReplay && (
            <button
              onClick={() => onReplay(run)}
              className="px-3 py-1.5 bg-[#FA5D19] hover:bg-[#e04f12] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Safe dry-run replay of this event"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Safe Replay</span>
            </button>
          )}

          {run.status === "running" && onCancelRun && (
            <button
              onClick={() => onCancelRun(run.id)}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
            >
              Cancel Run
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid: Execution Trace (left) + Diagnostics / Payload Viewer (right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Step Trace Timeline */}
        <div className="md:col-span-5 border-r border-neutral-200 pr-4 space-y-2">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
            Execution Steps ({run.stepRuns.length})
          </span>

          <div className="space-y-1.5">
            {run.stepRuns.map((step) => {
              const isSelected = step.stepId === selectedStepId;
              return (
                <div
                  key={step.stepId}
                  onClick={() => setSelectedStepId(step.stepId)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-orange-50/70 border-[#FA5D19] ring-1 ring-[#FA5D19]/20"
                      : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {step.status === "succeeded" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : step.status === "failed" ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-neutral-300 text-neutral-400 text-[10px] flex items-center justify-center font-bold">
                        –
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-neutral-900 block truncate">
                        {step.stepName || step.stepId}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {step.kind} • {step.durationMs ? `${step.durationMs}ms` : "0ms"}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Step Inspector */}
        <div className="md:col-span-7 space-y-3">
          {selectedStep ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-neutral-900 text-xs">
                    {selectedStep.stepName} ({selectedStep.kind})
                  </h5>
                  <p className="text-[11px] text-neutral-500">{selectedStep.summary}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopy(
                        activeTab === "outputs"
                          ? selectedStep.output
                          : activeTab === "inputs"
                            ? selectedStep.inputs
                            : selectedStep.error,
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-neutral-200">
                <button
                  onClick={() => setActiveTab("outputs")}
                  className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === "outputs"
                      ? "border-[#FA5D19] text-[#FA5D19]"
                      : "border-transparent text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Outputs
                </button>
                <button
                  onClick={() => setActiveTab("inputs")}
                  className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === "inputs"
                      ? "border-[#FA5D19] text-[#FA5D19]"
                      : "border-transparent text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Inputs
                </button>
                {selectedStep.error && (
                  <button
                    onClick={() => setActiveTab("error")}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === "error"
                        ? "border-rose-600 text-rose-600"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Error Details
                  </button>
                )}
              </div>

              {/* Output Viewer */}
              {activeTab === "outputs" && (
                <pre className="p-3 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-[220px] leading-relaxed">
                  {JSON.stringify(selectedStep.output || {}, null, 2)}
                </pre>
              )}

              {/* Inputs Viewer */}
              {activeTab === "inputs" && (
                <pre className="p-3 bg-neutral-900 text-neutral-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-[220px] leading-relaxed">
                  {JSON.stringify(selectedStep.inputs || {}, null, 2)}
                </pre>
              )}

              {/* Error Details */}
              {activeTab === "error" && selectedStep.error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900">
                  <div className="flex items-center gap-2 font-bold text-rose-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>{selectedStep.error.message || "Action failed"}</span>
                  </div>
                  {selectedStep.error.details && (
                    <p className="text-[11px] text-rose-800">{selectedStep.error.details}</p>
                  )}
                  <pre className="p-2.5 bg-neutral-900 text-rose-400 font-mono text-[11px] rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedStep.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">Select a step to inspect payload</div>
          )}
        </div>
      </div>
    </div>
  );
}
