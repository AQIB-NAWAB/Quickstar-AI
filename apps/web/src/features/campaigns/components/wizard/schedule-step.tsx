"use client";

import { AlertCircle, Calendar, Clock, Globe, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { CampaignPacing, CampaignSchedule } from "../../lib/types";

interface ScheduleStepProps {
  schedule: CampaignSchedule;
  pacing: CampaignPacing;
  onUpdate: (data: { schedule: CampaignSchedule; pacing: CampaignPacing }) => void;
  onBack: () => void;
  onContinue: () => void;
}

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (US & Canada) - America/New_York" },
  { value: "America/Chicago", label: "Central Time (US & Canada) - America/Chicago" },
  { value: "America/Denver", label: "Mountain Time (US & Canada) - America/Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada) - America/Los_Angeles" },
  { value: "Europe/London", label: "London / GMT - Europe/London" },
  { value: "Europe/Paris", label: "Central European Time - Europe/Paris" },
  { value: "Asia/Dubai", label: "Gulf Standard Time - Asia/Dubai" },
  { value: "Asia/Singapore", label: "Singapore / Hong Kong - Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Japan Standard Time - Asia/Tokyo" },
  { value: "Australia/Sydney", label: "Sydney - Australia/Sydney" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const WEEKDAY_OPTIONS = [
  { bit: 1, label: "Mon" },
  { bit: 2, label: "Tue" },
  { bit: 3, label: "Wed" },
  { bit: 4, label: "Thu" },
  { bit: 5, label: "Fri" },
  { bit: 6, label: "Sat" },
  { bit: 0, label: "Sun" },
];

export function ScheduleStep({
  schedule,
  pacing,
  onUpdate,
  onBack,
  onContinue,
}: ScheduleStepProps) {
  const [error, setError] = useState<string | null>(null);

  const activeWeekdays = schedule.weekdays ?? [1, 2, 3, 4, 5];
  const isRecipientLocal = schedule.timezoneMode === "recipient_local" || schedule.timezoneMode === "recipient";

  function handleContinue() {
    if (!schedule.startDate) {
      setError("Please select a campaign start date.");
      return;
    }
    if (schedule.endDate && schedule.endDate < schedule.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }
    if (schedule.dailyWindowFrom >= schedule.dailyWindowTo) {
      setError("Overnight calling windows are not permitted. Window 'From' must be earlier than 'To'.");
      return;
    }
    if (activeWeekdays.length === 0) {
      setError("Please select at least one active calling day.");
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

  function toggleWeekday(bit: number) {
    const next = activeWeekdays.includes(bit)
      ? activeWeekdays.filter((b) => b !== bit)
      : [...activeWeekdays, bit];
    onUpdate({
      schedule: { ...schedule, weekdays: next },
      pacing,
    });
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 3 &middot; Schedule, Timezones &amp; Pacing
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure start dates, lawful calling hours, recipient-local timezone policies, and dialing throughput.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-8 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5 text-xs">
        {/* Section 1: Date Bounds */}
        <div className="space-y-2">
          <div className="font-semibold text-accent-black flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>Campaign Dates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-neutral-700 font-medium block">Start date *</label>
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
              <label className="text-neutral-700 font-medium block">
                End date <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={schedule.endDate || ""}
                onChange={(e) =>
                  onUpdate({
                    schedule: { ...schedule, endDate: e.target.value || null },
                    pacing,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Timezone Policy & Modes */}
        <div className="space-y-2 pt-2 border-t border-border-faint">
          <div className="font-semibold text-accent-black flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span>Timezone &amp; Recipient Policy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  schedule: { ...schedule, timezoneMode: "fixed" },
                  pacing,
                })
              }
              className={`p-3 rounded-8 border text-left transition-colors cursor-pointer ${
                !isRecipientLocal
                  ? "border-heat-100 bg-orange-50/40 text-accent-black"
                  : "border-border-faint bg-white hover:bg-neutral-50 text-neutral-600"
              }`}
            >
              <div className="font-semibold text-xs">Campaign Timezone (Fixed)</div>
              <p className="text-[11px] text-neutral-500 mt-1">
                All calls respect the single designated campaign timezone regardless of contact location.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdate({
                  schedule: { ...schedule, timezoneMode: "recipient_local" },
                  pacing,
                })
              }
              className={`p-3 rounded-8 border text-left transition-colors cursor-pointer ${
                isRecipientLocal
                  ? "border-heat-100 bg-orange-50/40 text-accent-black"
                  : "border-border-faint bg-white hover:bg-neutral-50 text-neutral-600"
              }`}
            >
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <span>Recipient-Local Mode</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                  TCPA Safe
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Dials within each recipient&apos;s local hours. Holds contacts with unknown timezones.
              </p>
            </button>
          </div>

          {/* Timezone Selector */}
          <div className="space-y-1 pt-1">
            <label className="text-neutral-700 font-medium block">
              {isRecipientLocal ? "Fallback / Default Timezone" : "Campaign Calling Timezone"}
            </label>
            <select
              value={schedule.timezone || "UTC"}
              onChange={(e) =>
                onUpdate({
                  schedule: { ...schedule, timezone: e.target.value },
                  pacing,
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {isRecipientLocal && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-8 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-[#B54708] shrink-0 mt-0.5" />
              <div>
                <strong>Hold policy active:</strong> Any contact imported without a trusted IANA timezone (or valid area-code mapping) will be automatically held with status <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">held_reason = unknown_timezone</code> to guarantee calling hours compliance.
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Daily Calling Window & Active Days */}
        <div className="space-y-3 pt-2 border-t border-border-faint">
          <div className="font-semibold text-accent-black flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>Daily Calling Window &amp; Active Days</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-neutral-600 block">Window Open (From)</label>
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

            <div className="space-y-1">
              <label className="text-neutral-600 block">Window Close (To)</label>
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

          {/* Weekday Selector Pills */}
          <div className="space-y-1.5 pt-1">
            <label className="text-neutral-700 font-medium block">Active calling weekdays</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WEEKDAY_OPTIONS.map((day) => {
                const isSelected = activeWeekdays.includes(day.bit);
                return (
                  <button
                    key={day.bit}
                    type="button"
                    onClick={() => toggleWeekday(day.bit)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-8 border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-accent-black text-white border-accent-black"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Concurrency & Pacing */}
        <div className="space-y-4 pt-2 border-t border-border-faint">
          <div className="font-semibold text-accent-black">Dialing Throughput &amp; Pacing</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-700 font-medium">Max concurrent calls</label>
                <span className="font-mono text-accent-black font-bold">
                  {pacing.maxConcurrentCalls} lines
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={pacing.maxConcurrentCalls}
                onChange={(e) =>
                  onUpdate({
                    schedule,
                    pacing: { ...pacing, maxConcurrentCalls: parseInt(e.target.value) || 1 },
                  })
                }
                className="w-full accent-[#FF571A] cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">Simultaneous ongoing calls cap (workspace limit: 20).</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-700 font-medium">Max call starts / min</label>
                <span className="font-mono text-accent-black font-bold">
                  {pacing.maxCallStartsPerMinute} starts/min
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={pacing.maxCallStartsPerMinute}
                onChange={(e) =>
                  onUpdate({
                    schedule,
                    pacing: { ...pacing, maxCallStartsPerMinute: parseInt(e.target.value) || 5 },
                  })
                }
                className="w-full accent-[#FF571A] cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">Prevents carrier burst flooding and spam scoring.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border-faint">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-8 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2 rounded-8 text-xs font-semibold bg-heat-100 text-white hover:bg-heat-200 shadow-xs transition-colors cursor-pointer"
        >
          Continue to Retry Policy &rarr;
        </button>
      </div>
    </div>
  );
}
