"use client";

import { ChevronUp,X } from "lucide-react";
import { useState } from "react";
import type { WorkflowRun } from "../lib/types";
import { PayloadViewer } from "./payload-viewer";
import { RunStatusBadge } from "./run-status-badge";
import { StepTrace } from "./step-trace";

interface RunDetailsProps {
  run: WorkflowRun;
  onClose?: () => void;
  isInline?: boolean;
}

export function RunDetails({ run, onClose, isInline = false }: RunDetailsProps) {
  // Default selected step to failed step if any, else the first step
  const failedStep = run.stepRuns.find((s) => s.status === "failed");
  const [selectedStepId, setSelectedStepId] = useState<string>(
    failedStep ? failedStep.stepId : run.stepRuns[0]?.stepId || ""
  );

  const selectedStep = run.stepRuns.find((s) => s.stepId === selectedStepId) || run.stepRuns[0];

  return (
    <div className={`bg-white border border-border-faint rounded-12 p-4 sm:p-5 shadow-xs space-y-4 ${isInline ? "mt-3" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-faint">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-bold text-accent-black font-mono tracking-tight">
            Run details &middot; {run.id}
          </h4>
          <RunStatusBadge status={run.status} />
          {run.definitionVersion && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200">
              v{run.definitionVersion}
            </span>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-6 transition-colors"
            title="Collapse diagnostics"
            aria-label="Collapse diagnostics"
          >
            {isInline ? <ChevronUp className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Two-Column Grid: Step Trace (left) + Diagnostics (right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-5 border-r md:border-border-faint md:pr-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Execution Steps
          </p>
          <StepTrace
            steps={run.stepRuns}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
          />
        </div>

        <div className="md:col-span-7">
          {selectedStep ? (
            <PayloadViewer step={selectedStep} />
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400 italic">
              No step selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
