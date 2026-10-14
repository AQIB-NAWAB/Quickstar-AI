import type { LeadStatus } from "../lib/types";

interface LeadStatusBadgeProps {
  status: LeadStatus | string;
  className?: string;
}

export function LeadStatusBadge({ status, className = "" }: LeadStatusBadgeProps) {
  const norm = (status || "").toLowerCase();

  if (norm === "qualified") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>Qualified</span>
      </span>
    );
  }

  if (norm === "contacted") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/70 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
        <span>Contacted</span>
      </span>
    );
  }

  if (norm === "disqualified") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200/70 tracking-tight ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
        <span>Disqualified</span>
      </span>
    );
  }

  // Default / "new" status
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/70 tracking-tight capitalize ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
      <span>{norm === "new" ? "New" : status}</span>
    </span>
  );
}
