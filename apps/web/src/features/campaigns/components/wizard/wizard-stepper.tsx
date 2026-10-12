import React from "react";

interface WizardStepperProps {
  currentStep: number; // 1 to 5
  onSelectStep?: (step: number) => void;
}

const STEPS = [
  { step: 1, label: "Details" },
  { step: 2, label: "Audience" },
  { step: 3, label: "Schedule" },
  { step: 4, label: "Retry policy" },
  { step: 5, label: "Review" },
];

export function WizardStepper({ currentStep, onSelectStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center overflow-x-auto gap-2 sm:gap-4 select-none py-2">
      {STEPS.map((s, idx) => {
        const isActive = s.step === currentStep;
        const isCompleted = s.step < currentStep;
        const canClick = isCompleted && onSelectStep;

        return (
          <React.Fragment key={s.step}>
            <button
              type="button"
              onClick={() => canClick && onSelectStep(s.step)}
              disabled={!canClick}
              className={`flex shrink-0 items-center gap-1.5 transition-colors ${
                canClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? "bg-heat-100 text-white shadow-xs ring-2 ring-orange-200"
                    : isCompleted
                      ? "border border-heat-100 text-heat-100 bg-orange-50/50"
                      : "border border-neutral-300 text-neutral-400 bg-neutral-50"
                }`}
              >
                {s.step}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  isActive
                    ? "text-accent-black font-bold"
                    : isCompleted
                      ? "text-neutral-700"
                      : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
            </button>

            {idx < STEPS.length - 1 && (
              <div
                className={`shrink-0 h-px w-6 sm:w-10 transition-colors ${
                  isCompleted ? "bg-heat-100" : "bg-neutral-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
