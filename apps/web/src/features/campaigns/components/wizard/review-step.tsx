"use client";

import { isAudienceOnlyCampaign } from "../../lib/telephony-mode";
import type { WizardDraft } from "../../lib/types";

interface ReviewStepProps {
  draft: WizardDraft;
  isPreview?: boolean;
  onGoToStep: (step: number) => void;
  onBack: () => void;
  onSaveDraft: () => void;
}

export function ReviewStep({
  draft,
  onGoToStep,
  onBack,
  onSaveDraft,
}: ReviewStepProps) {
  const audienceOnly = isAudienceOnlyCampaign(draft);

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 5 &middot; Review Campaign Setup
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Verify audience numbers, scheduling windows, and pacing caps before saving.
        </p>
      </div>

      <div className="space-y-4 text-xs divide-y divide-border-faint">
        {/* Section 1: Details */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-400 uppercase text-[11px] tracking-wider">
              1. Campaign Details
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="text-heat-100 hover:underline font-medium text-xs"
            >
              Edit
            </button>
          </div>
          <p className="font-bold text-accent-black text-sm">{draft.name}</p>
          {draft.description && (
            <p className="text-neutral-500 leading-normal">{draft.description}</p>
          )}
          <p className="text-neutral-600">
            Agent: <span className="font-semibold">{draft.agentName}</span>
          </p>
          <p className="text-neutral-600">
            Type:{" "}
            <span className="font-semibold">
              {audienceOnly ? "Audience only (no telephony)" : "Outbound calls"}
            </span>
          </p>
        </div>

        {/* Section 2: Audience */}
        <div className="space-y-1 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-400 uppercase text-[11px] tracking-wider">
              2. Audience
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="text-heat-100 hover:underline font-medium text-xs"
            >
              Edit
            </button>
          </div>
          <p className="text-neutral-700">
            {draft.audienceSource === "lead_run" ? "Lead generation run" : "File"}:{" "}
            <span className="font-semibold">
              {draft.fileName || (draft.audienceSource === "lead_run" ? "No run selected" : "No file uploaded")}
            </span>
          </p>
          <p className="text-emerald-700 font-medium">
            Eligible contacts: {draft.validCount} valid ({draft.invalidCount} invalid, {draft.duplicateCount} duplicates excluded)
          </p>
        </div>

        {/* Section 3: Schedule & Pacing */}
        <div className="space-y-1 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-400 uppercase text-[11px] tracking-wider">
              3. Schedule &amp; Pacing
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="text-heat-100 hover:underline font-medium text-xs"
            >
              Edit
            </button>
          </div>
          <p className="text-neutral-700">
            Start: {draft.schedule.startDate} &middot; {draft.schedule.startTime} {draft.schedule.timezone}
          </p>
          <p className="text-neutral-700">
            Daily window: {draft.schedule.dailyWindowFrom} &ndash; {draft.schedule.dailyWindowTo} {draft.schedule.timezone}
          </p>
          <p className="text-neutral-700">
            Capacity: {draft.pacing.maxConcurrentCalls} concurrent calls &middot; Pacing: {draft.pacing.maxCallStartsPerMinute} starts/min
          </p>
        </div>

        {/* Section 4: Retry policy */}
        <div className="space-y-1 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-400 uppercase text-[11px] tracking-wider">
              4. Retry Policy
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(4)}
              className="text-heat-100 hover:underline font-medium text-xs"
            >
              Edit
            </button>
          </div>
          <p className="text-neutral-700">
            {draft.retryPolicy.maxRetries} retries per contact &middot; Spaced {draft.retryPolicy.retryIntervalMinutes} minutes apart
          </p>
        </div>
      </div>

      {!audienceOnly && (
        <div className="p-3 bg-neutral-50 rounded-8 border border-neutral-200 text-xs text-neutral-500">
          Outbound launch needs telephony. You can still save this draft and come back to launch
          later.
        </div>
      )}

      {audienceOnly && (
        <div className="p-3 bg-emerald-50/60 rounded-8 border border-emerald-200/80 text-xs text-emerald-800">
          This campaign does not place calls. Save it to keep the audience and schedule on file.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black transition-colors"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            className={
              audienceOnly
                ? "px-5 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] shadow-xs transition-colors"
                : "px-4 py-2 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black transition-colors"
            }
          >
            {audienceOnly ? "Save campaign" : "Save draft"}
          </button>
          {!audienceOnly && (
            <button
              type="button"
              disabled={true}
              title="Connect telephony to launch outbound calls."
              className="px-5 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white opacity-50 cursor-not-allowed"
            >
              Launch campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
