"use client";

import { useState } from "react";
import type { CampaignRetryPolicy } from "../../lib/types";

interface RetryPolicyStepProps {
  retryPolicy: CampaignRetryPolicy;
  onUpdate: (policy: CampaignRetryPolicy) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function RetryPolicyStep({
  retryPolicy,
  onUpdate,
  onBack,
  onContinue,
}: RetryPolicyStepProps) {
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (retryPolicy.maxRetries < 0) {
      setError("Maximum retries cannot be negative.");
      return;
    }
    if (retryPolicy.maxRetries > 0 && retryPolicy.retryIntervalMinutes <= 0) {
      setError("Retry interval must be greater than zero when retries are enabled.");
      return;
    }

    setError(null);
    onContinue();
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-xl mx-auto space-y-5">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 4 &middot; Retry Policy
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Specify redial attempts and spacing for unanswered or busy calls.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-8">
          {error}
        </div>
      )}

      <div className="space-y-4 text-xs">
        {/* Retries and Interval */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">
              Max retries per contact
            </label>
            <input
              type="number"
              min={0}
              max={5}
              value={retryPolicy.maxRetries}
              onChange={(e) =>
                onUpdate({
                  ...retryPolicy,
                  maxRetries: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Total attempts = {1 + retryPolicy.maxRetries} (1 initial + {retryPolicy.maxRetries} retries).
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">
              Retry interval (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={1440}
              disabled={retryPolicy.maxRetries === 0}
              value={retryPolicy.retryIntervalMinutes}
              onChange={(e) =>
                onUpdate({
                  ...retryPolicy,
                  retryIntervalMinutes: Math.max(5, parseInt(e.target.value) || 30),
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono disabled:bg-neutral-100 disabled:text-neutral-400"
            />
            <p className="text-[11px] text-neutral-400">
              Spacing between consecutive attempts.
            </p>
          </div>
        </div>

        {/* Eligible outcomes */}
        <div className="space-y-2 pt-2 border-t border-border-faint">
          <label className="text-neutral-700 font-semibold block">
            Eligible retry call outcomes
          </label>
          <div className="space-y-2">
            {[
              { id: "no_answer", label: "No answer (timeout)" },
              { id: "busy", label: "Line busy" },
              { id: "transient_error", label: "Transient provider / carrier error" },
            ].map((outcome) => {
              const isChecked = retryPolicy.eligibleOutcomes.includes(outcome.id);
              return (
                <label key={outcome.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...retryPolicy.eligibleOutcomes, outcome.id]
                        : retryPolicy.eligibleOutcomes.filter((o) => o !== outcome.id);
                      onUpdate({ ...retryPolicy, eligibleOutcomes: next });
                    }}
                    className="rounded border-neutral-300 text-heat-100 focus:ring-heat-100"
                  />
                  <span className="text-neutral-700">{outcome.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-neutral-400">
            Contacts that opt-out or encounter invalid numbers are never retried.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] shadow-xs transition-colors"
        >
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}
