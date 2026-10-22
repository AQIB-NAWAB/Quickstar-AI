import { Activity, Calendar, Clock, Globe, Phone, RefreshCw, User } from "lucide-react";
import type { CampaignDetail } from "../lib/types";

interface ExecutionSettingsProps {
  campaign: CampaignDetail;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ExecutionSettings({ campaign }: ExecutionSettingsProps) {
  const { agentName, schedule, pacing, retryPolicy, metrics, callerId } = campaign;

  const weekdaysText =
    schedule?.weekdays && schedule.weekdays.length > 0 && schedule.weekdays.length < 7
      ? schedule.weekdays
          .slice()
          .sort((a, b) => a - b)
          .map((d) => WEEKDAY_NAMES[d] || d)
          .join(", ")
      : "Every day";

  const timezoneModeLabel =
    schedule?.timezoneMode === "recipient_local" || schedule?.timezoneMode === "recipient"
      ? "Recipient local"
      : `Fixed (${schedule?.timezone || "UTC"})`;

  const activePct =
    pacing?.maxConcurrentCalls > 0
      ? Math.min(100, Math.round(((metrics?.activeCalls || 0) / pacing.maxConcurrentCalls) * 100))
      : 0;

  const rows = [
    {
      icon: User,
      label: "Agent",
      value: agentName || "—",
    },
    {
      icon: Phone,
      label: "Caller ID",
      value: callerId || "Default pool",
    },
    {
      icon: Globe,
      label: "Timezone mode",
      value: timezoneModeLabel,
    },
    {
      icon: Calendar,
      label: "Active days",
      value: weekdaysText,
    },
    {
      icon: Clock,
      label: "Daily window",
      value: schedule?.dailyWindowFrom
        ? `${schedule.dailyWindowFrom} – ${schedule.dailyWindowTo}`
        : "—",
    },
    {
      icon: Activity,
      label: "Pacing limit",
      value: pacing?.maxCallStartsPerMinute
        ? `${pacing.maxCallStartsPerMinute} starts / min`
        : "—",
    },
    {
      icon: RefreshCw,
      label: "Retry policy",
      value: retryPolicy
        ? `${retryPolicy.maxRetries} retries · ${retryPolicy.retryIntervalMinutes}m interval`
        : "—",
    },
  ];

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-accent-black tracking-tight">
          Execution settings
        </h3>
        <span className="text-[11px] text-neutral-400 font-mono">
          Concurrency {metrics?.activeCalls || 0} / {pacing?.maxConcurrentCalls || 1}
        </span>
      </div>

      {/* Concurrency Capacity Gauge */}
      <div className="space-y-1.5 bg-neutral-50 p-3 rounded-8 border border-border-faint">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-medium">Throughput capacity</span>
          <span className="font-mono font-bold text-accent-black">{activePct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
          <div
            className="h-full bg-heat-100 rounded-full transition-all duration-300"
            style={{ width: `${activePct}%` }}
          />
        </div>
        <p className="text-[10px] text-neutral-400">
          {metrics?.activeCalls || 0} slots in use of {pacing?.maxConcurrentCalls || 1} max concurrent
        </p>
      </div>

      <div className="space-y-2.5">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-500">
              <Icon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>{label}</span>
            </div>
            <span className="font-semibold text-accent-black font-mono text-right text-[11px]">
              {value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-neutral-400 pt-1 border-t border-border-faint">
        Pacing and window rules evaluated before every attempt.
      </p>
    </div>
  );
}
