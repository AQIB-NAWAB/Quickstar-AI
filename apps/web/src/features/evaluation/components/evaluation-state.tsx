"use client";

import { AlertCircle,RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface EvaluationStateProps {
  status: "unavailable" | "forbidden" | "not_found" | "error";
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function EvaluationState({
  status,
  title,
  message,
  onRetry,
}: EvaluationStateProps) {
  const router = useRouter();

  const getDefaultTitle = () => {
    switch (status) {
      case "unavailable":
        return "Agent evaluation is not available yet";
      case "forbidden":
        return "Access denied";
      case "not_found":
        return "Resource not found";
      default:
        return "Evaluation service error";
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case "unavailable":
        return "This workspace’s evaluation service is not connected. Configure an offline evaluation worker or connect the evaluation backend to enable benchmark runs.";
      case "forbidden":
        return "You do not have permission to access or run evaluations in this workspace.";
      case "not_found":
        return "The requested dataset, run, or evaluation resource could not be found in this workspace.";
      default:
        return "An unexpected error occurred while communicating with the evaluation repository.";
    }
  };

  return (
    <div className="rounded-xl border border-[#ededed] bg-white p-12 text-center max-w-xl mx-auto shadow-xs my-8 space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-[#fa5d19]">
        <AlertCircle className="h-6 w-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-bold text-[#262626]">
          {title || getDefaultTitle()}
        </h2>
        <p className="text-xs text-[#737373] max-w-md mx-auto">
          {message || getDefaultMessage()}
        </p>
      </div>

      {status !== "forbidden" && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry || (() => router.refresh())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ededed] bg-white px-3.5 py-2 text-xs font-medium text-[#262626] hover:bg-[#f9f9f9] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#737373]" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
