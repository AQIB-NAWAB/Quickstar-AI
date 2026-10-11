import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface WorkflowUnavailableStateProps {
  backUrl?: string;
  title?: string;
  description?: string;
}

export function WorkflowUnavailableState({
  backUrl,
  title = "Workflow automation is not available yet.",
  description = "This workspace’s workflow service is not connected. Workflow definitions, trigger consumers, and orchestration execution APIs are pending backend implementation.",
}: WorkflowUnavailableStateProps) {
  return (
    <div className="space-y-4">
      {backUrl && (
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-[#e04e10] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All workflows</span>
        </Link>
      )}

      <div className="bg-white border border-border-faint rounded-12 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
          <span className="text-xl">⚙️</span>
        </div>
        <h2 className="text-base font-bold text-accent-black tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        <div className="pt-2">
          <p className="text-[11px] font-mono text-neutral-400">
            See apps/web/src/features/workflows/BACKEND_DEPENDENCIES.md for contracts.
          </p>
        </div>
      </div>
    </div>
  );
}
