"use client";

import { Check,Clock,Minus,X } from "lucide-react";
import type { StepRun } from "../lib/types";

interface StepTraceProps {
  steps: StepRun[];
  selectedStepId: string;
  onSelectStep: (stepId: string) => void;
}

export function StepTrace({
  steps,
  selectedStepId,
  onSelectStep,
}: StepTraceProps) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const isSelected = step.stepId === selectedStepId;
        const stepNum = idx + 1;

        let statusIcon = (
          <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0">
            <Minus className="w-3 h-3" />
          </div>
        );
        let summaryColor = "text-neutral-500";

        if (step.status === "succeeded") {
          statusIcon = (
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" />
            </div>
          );
        } else if (step.status === "failed") {
          statusIcon = (
            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <X className="w-3 h-3" />
            </div>
          );
          summaryColor = "text-red-600 font-semibold";
        } else if (step.status === "running") {
          statusIcon = (
            <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3 animate-spin" />
            </div>
          );
        } else if (step.status === "skipped") {
          statusIcon = (
            <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0">
              <Minus className="w-3 h-3" />
            </div>
          );
        }

        return (
          <button
            key={step.stepId}
            type="button"
            onClick={() => onSelectStep(step.stepId)}
            className={`w-full text-left p-2.5 rounded-8 flex items-center gap-3 transition-colors border ${
              isSelected
                ? "bg-neutral-100/80 border-neutral-300 text-accent-black font-medium"
                : "bg-white hover:bg-neutral-50 border-transparent text-neutral-700"
            }`}
          >
            <span className="text-xs font-mono text-neutral-400 w-3 text-right">
              {stepNum}
            </span>
            {statusIcon}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate leading-tight">
                {step.stepName}
              </p>
              {step.summary && (
                <p className={`text-[11px] font-mono truncate ${summaryColor}`}>
                  {step.summary}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
