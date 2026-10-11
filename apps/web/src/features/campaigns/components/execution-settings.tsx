import { Activity,Calendar,Clock,Phone,RefreshCw,User } from "lucide-react";
import type { CampaignDetail } from "../lib/types";

interface ExecutionSettingsProps {
  campaign: CampaignDetail;
}

export function ExecutionSettings({ campaign }: ExecutionSettingsProps) {
  const { agentName, schedule, pacing, retryPolicy } = campaign;

  const rows = [
    {
      icon: User,
      label: "Agent",
      value: agentName || "—",
    },
    {
      icon: Phone,
      label: "Max concurrent calls",
      value: pacing?.maxConcurrentCalls ? String(pacing.maxConcurrentCalls) : "—",
    },
    {
      icon: Activity,
      label: "Pacing limit",
      value: pacing?.maxCallStartsPerMinute
        ? `${pacing.maxCallStartsPerMinute} call starts / min`
        : "—",
    },
    {
      icon: Calendar,
      label: "Schedule",
      value: schedule?.startDate
        ? `${schedule.startDate} · ${schedule.startTime} ${schedule.timezone}`
        : "—",
    },
    {
      icon: Clock,
      label: "Daily window",
      value: schedule?.dailyWindowFrom
        ? `${schedule.dailyWindowFrom} – ${schedule.dailyWindowTo} ${schedule.timezone}`
        : "—",
    },
    {
      icon: RefreshCw,
      label: "Retry policy",
      value: retryPolicy
        ? `${retryPolicy.maxRetries} retries · ${retryPolicy.retryIntervalMinutes} min apart`
        : "—",
    },
  ];

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-bold text-accent-black tracking-tight">
          Execution settings
        </h3>
      </div>

      <div className="space-y-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-500">
              <Icon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>{label}</span>
            </div>
            <span className="font-semibold text-accent-black font-mono text-right">
              {value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-neutral-400 pt-1 border-t border-border-faint">
        Configured values shown for preview.
      </p>
    </div>
  );
}
