import { Loader2 } from "lucide-react";
import type { KnowledgeSourceStatus } from "../lib/types";
import { mapBackendStatusToPresentation } from "../lib/format";

interface SourceStatusBadgeProps {
  status: KnowledgeSourceStatus | string;
  className?: string;
}

export function SourceStatusBadge({ status, className = "" }: SourceStatusBadgeProps) {
  const { presentation, label } = mapBackendStatusToPresentation(status);

  if (presentation === "processing") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-heat-100 ${className}`}
        aria-label={`Status: ${label}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-heat-100" />
        <span>{label}</span>
      </span>
    );
  }

  if (presentation === "ready") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A] ${className}`}
        aria-label={`Status: ${label}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        <span>{label}</span>
      </span>
    );
  }

  if (presentation === "failed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-accent-crimson ${className}`}
        aria-label={`Status: ${label}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent-crimson" />
        <span>{label}</span>
      </span>
    );
  }

  if (presentation === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 ${className}`}
        aria-label={`Status: ${label}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 ${className}`}
      aria-label={`Status: ${label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
      <span>{label}</span>
    </span>
  );
}
