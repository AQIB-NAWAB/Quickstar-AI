import type { LeadStatus } from "../lib/types";

interface LeadStatusBadgeProps {
  status: LeadStatus | string;
  className?: string;
}

export function LeadStatusBadge({ status, className = "" }: LeadStatusBadgeProps) {
  const norm = status.toLowerCase();

  if (norm === "qualified") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-heat-100 border border-orange-200/80 tracking-tight ${className}`}
      >
        Qualified
      </span>
    );
  }

  if (norm === "disqualified") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200/80 tracking-tight ${className}`}
      >
        Disqualified
      </span>
    );
  }

  if (norm === "contacted") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80 tracking-tight ${className}`}
      >
        Contacted
      </span>
    );
  }

  if (norm === "new") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80 tracking-tight ${className}`}
      >
        New
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-500 border border-neutral-200/80 tracking-tight capitalize ${className}`}
    >
      {status}
    </span>
  );
}
