import type { CampaignStatus,ContactStatus } from "../lib/types";

interface CampaignStatusBadgeProps {
  status: CampaignStatus | string;
  className?: string;
}

export function CampaignStatusBadge({
  status,
  className = "",
}: CampaignStatusBadgeProps) {
  const norm = status.toLowerCase();

  if (norm === "running") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Running</span>
      </span>
    );
  }

  if (norm === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>Completed</span>
      </span>
    );
  }

  if (norm === "paused") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FEDF89] tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#B54708]" />
        <span>Paused</span>
      </span>
    );
  }

  if (norm === "scheduled") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>Scheduled</span>
      </span>
    );
  }

  if (norm === "failed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200/80 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span>Failed</span>
      </span>
    );
  }

  // draft or other
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 tracking-tight capitalize ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
      <span>{status}</span>
    </span>
  );
}

export function ContactStatusBadge({
  status,
  className = "",
}: {
  status: ContactStatus | string;
  className?: string;
}) {
  const norm = status.toLowerCase();

  if (norm === "answered" || norm === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Completed</span>
      </span>
    );
  }

  if (norm === "calling" || norm === "in_progress") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Calling</span>
      </span>
    );
  }

  if (norm === "held") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FEDF89] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#B54708]" />
        <span>Held</span>
      </span>
    );
  }

  if (norm === "retrying") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span>Retrying</span>
      </span>
    );
  }

  if (norm === "no_answer") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>No Answer</span>
      </span>
    );
  }

  if (norm === "busy") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>Busy</span>
      </span>
    );
  }

  if (norm === "failed" || norm === "suppressed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-200/80 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span>{norm === "suppressed" ? "Suppressed" : "Failed"}</span>
      </span>
    );
  }

  if (norm === "opted_out") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>Opted out</span>
      </span>
    );
  }

  // pending / other
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 capitalize ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
      <span>{norm === "pending" ? "Pending" : status}</span>
    </span>
  );
}
