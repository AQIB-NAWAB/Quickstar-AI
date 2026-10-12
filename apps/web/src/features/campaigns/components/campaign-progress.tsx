import { formatNumber,formatPercent } from "../lib/format";
import type { CampaignMetrics } from "../lib/types";

interface CampaignProgressProps {
  metrics: CampaignMetrics;
}

export function CampaignProgress({ metrics }: CampaignProgressProps) {
  const {
    eligibleContacts,
    completedContacts,
    activeCalls,
    queuedContacts,
    retryingContacts,
    startedAttempts,
  } = metrics;

  const percentage =
    eligibleContacts > 0 ? (completedContacts / eligibleContacts) * 100 : 0;

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-3">
      {/* Header and percentage */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            Campaign progress
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {formatNumber(completedContacts)} of {formatNumber(eligibleContacts)} contacts completed
          </p>
        </div>
        <div className="text-sm font-bold text-accent-black font-mono">
          {formatPercent(percentage, 1)}
        </div>
      </div>

      {/* Progress Track */}
      <div
        className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden relative"
        role="progressbar"
        aria-valuenow={completedContacts}
        aria-valuemin={0}
        aria-valuemax={eligibleContacts}
        aria-label={`Campaign progress ${completedContacts} of ${eligibleContacts} completed`}
      >
        <div
          className="h-full bg-heat-100 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      {/* Operational Breakdown */}
      <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-heat-100" />
          <span className="text-neutral-500">Active</span>
          <span className="font-bold text-accent-black font-mono">
            {formatNumber(activeCalls)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-400" />
          <span className="text-neutral-500">Queued</span>
          <span className="font-bold text-accent-black font-mono">
            {formatNumber(queuedContacts)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          <span className="text-neutral-500">Retrying</span>
          <span className="font-bold text-accent-black font-mono">
            {formatNumber(retryingContacts)}
          </span>
          <span className="text-[11px] text-neutral-400">&middot; included in queued</span>
        </div>
      </div>

      {/* Attempts footer note */}
      <p className="text-[11px] text-neutral-400 pt-1 border-t border-border-faint/80">
        {formatNumber(startedAttempts)} call attempts started, including retries.
      </p>
    </div>
  );
}
