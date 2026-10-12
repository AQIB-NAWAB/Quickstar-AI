"use client";

import { useState } from "react";
import type { CampaignPacing,CampaignSchedule } from "../../lib/types";

interface ScheduleStepProps {
  schedule: CampaignSchedule;
  pacing: CampaignPacing;
  onUpdate: (data: { schedule: CampaignSchedule; pacing: CampaignPacing }) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function ScheduleStep({
  schedule,
  pacing,
  onUpdate,
  onBack,
  onContinue,
}: ScheduleStepProps) {
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (schedule.dailyWindowFrom >= schedule.dailyWindowTo) {
      setError("Daily call window 'From' must be earlier than 'To'.");
      return;
    }
    if (pacing.maxConcurrentCalls <= 0) {
      setError("Max concurrent calls must be a positive integer.");
      return;
    }
    if (pacing.maxCallStartsPerMinute <= 0) {
      setError("Max call starts per minute must be a positive integer.");
      return;
    }

    setError(null);
    onContinue();
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 3 &middot; Schedule &amp; Pacing
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure start date, daily calling windows, concurrent call capacity, and start pacing.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-8">
          {error}
        </div>
      )}

      <div className="space-y-4 text-xs">
        {/* Row 1: Start date, Start time, Timezone */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">Start date</label>
            <input
              type="date"
              value={schedule.startDate}
              onChange={(e) =>
                onUpdate({
                  schedule: { ...schedule, startDate: e.target.value },
                  pacing,
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">Start time</label>
            <input
              type="time"
              value={schedule.startTime}
              onChange={(e) =>
                onUpdate({
                  schedule: { ...schedule, startTime: e.target.value },
                  pacing,
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">Timezone</label>
            <select
              value={schedule.timezone}
              onChange={(e) =>
                onUpdate({
                  schedule: { ...schedule, timezone: e.target.value },
                  pacing,
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Daily call window */}
        <div className="space-y-1 pt-1">
          <label className="text-neutral-700 font-semibold block">
            Daily call window (UTC)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">From:</span>
              <input
                type="time"
                value={schedule.dailyWindowFrom}
                onChange={(e) =>
                  onUpdate({
                    schedule: { ...schedule, dailyWindowFrom: e.target.value },
                    pacing,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">To:</span>
              <input
                type="time"
                value={schedule.dailyWindowTo}
                onChange={(e) =>
                  onUpdate({
                    schedule: { ...schedule, dailyWindowTo: e.target.value },
                    pacing,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Concurrency and Pacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">
              Max concurrent calls
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={pacing.maxConcurrentCalls}
              onChange={(e) =>
                onUpdate({
                  schedule,
                  pacing: {
                    ...pacing,
                    maxConcurrentCalls: parseInt(e.target.value) || 1,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Limits simultaneously active ongoing phone calls.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">
              Max call starts per minute
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={pacing.maxCallStartsPerMinute}
              onChange={(e) =>
                onUpdate({
                  schedule,
                  pacing: {
                    ...pacing,
                    maxCallStartsPerMinute: parseInt(e.target.value) || 1,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Pacing throttle for initiating new dialing attempts.
            </p>
          </div>
        </div>

        <div className="p-3 bg-neutral-50 rounded-8 border border-neutral-200/60 text-[11px] text-neutral-500">
          Concurrency limits simultaneous calls. Pacing limits new call starts.
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
