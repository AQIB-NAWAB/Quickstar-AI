"use client";

import { AlertCircle, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface EvaluationStateProps {
  status: "unavailable" | "forbidden" | "not_found" | "error" | "loading";
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

  if (status === "loading") {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-10 bg-[#F1F3F5] rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#F8F9FB] rounded-xl border border-[#EAECF0]" />
          ))}
        </div>
        <div className="h-64 bg-[#F8F9FB] rounded-xl border border-[#EAECF0]" />
      </div>
    );
  }

  const getDefaultTitle = () => {
    switch (status) {
      case "unavailable":
        return "Agent evaluation is not available";
      case "forbidden":
        return "Evaluation permissions required";
      case "not_found":
        return "Evaluation resource not found";
      default:
        return "Evaluation service error";
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case "unavailable":
        return "The evaluation microservice is currently unreachable. Check your gateway routing or background worker.";
      case "forbidden":
        return "You do not have workspace.eval.read or workspace.eval.write permission in this workspace. Contact an administrator to adjust your role.";
      case "not_found":
        return "The requested dataset, run, or evaluation comparison could not be located in this workspace.";
      default:
        return "An unexpected error occurred while communicating with the evaluation backend.";
    }
  };

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-10 text-center max-w-xl mx-auto shadow-sm my-8 space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3F2] text-[#B42318]">
        {status === "forbidden" ? <Lock className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-bold text-[#18181B]">
          {title || getDefaultTitle()}
        </h2>
        <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
          {message || getDefaultMessage()}
        </p>
      </div>

      {status !== "forbidden" && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry || (() => router.refresh())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAECF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F8F9FB] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#71717A]" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
