import type { KnowledgeSourceStatus } from "../lib/types";
import { mapBackendStatusToPresentation } from "../lib/format";

interface SourceStatusBadgeProps {
  status: KnowledgeSourceStatus | string;
  className?: string;
}

export function SourceStatusBadge({ status, className = "" }: SourceStatusBadgeProps) {
  const { presentation, label } = mapBackendStatusToPresentation(status);

  if (presentation === "ready") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9F9EF] text-[#15803D] ${className}`}
        aria-label={`Status: ${label}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        <span>{label}</span>
      </span>
    );
  }

  if (presentation === "indexing") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF6EE] text-[#B45309] ${className}`}
        aria-label={`Status: ${label}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
        <span>{label}</span>
      </span>
    );
  }

  if (presentation === "failed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3F2] text-[#B42318] ${className}`}
        aria-label={`Status: ${label}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F4F7] text-[#475467] ${className}`}
      aria-label={`Status: ${label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#98A2B3]" />
      <span>{label}</span>
    </span>
  );
}
