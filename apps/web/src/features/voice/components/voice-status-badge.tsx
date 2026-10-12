import type { InboundCallStatus } from "../lib/types";

interface VoiceStatusBadgeProps {
  status: InboundCallStatus | string;
  className?: string;
}

export function VoiceStatusBadge({ status, className = "" }: VoiceStatusBadgeProps) {
  const norm = status.toLowerCase();

  if (norm === "live") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-heat-100 border border-orange-200/80 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-heat-100 animate-pulse" />
        <span>Live</span>
      </span>
    );
  }

  if (norm === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Completed</span>
      </span>
    );
  }

  if (norm === "transferred") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>Transferred</span>
      </span>
    );
  }

  if (norm === "failed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/80 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span>Failed</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 capitalize tracking-tight ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
      <span>{status}</span>
    </span>
  );
}
