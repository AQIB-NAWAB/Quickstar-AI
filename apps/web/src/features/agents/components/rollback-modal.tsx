"use client";

import { useState } from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import type { AgentVersion } from "../lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  version: AgentVersion | null;
  agentName: string;
};

export function RollbackModal({
  isOpen,
  onClose,
  onConfirm,
  version,
  agentName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !version) return null;

  async function handleRollback() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to restore release");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rollback-modal-title"
        className="w-full max-w-md rounded-[12px] border border-[#E1E5EA] bg-white p-6 shadow-xl relative"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1.5 rounded-[6px] text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#FFF3ED] text-[#F15A24] flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 id="rollback-modal-title" className="text-[17px] font-semibold text-[#202125]">
              Restore Release #{version.release_number}
            </h3>
            <p className="text-[13px] text-[#667085]">Agent: {agentName}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-[13px] text-[#667085] leading-relaxed">
          <p>
            You are about to switch live production to <strong>Release #{version.release_number}</strong>.
            All active channels and customer conversations will immediately serve this snapshot.
          </p>

          <div className="p-3.5 rounded-[8px] bg-[#F8F9FA] border border-[#E1E5EA] space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-[#667085]">Target release:</span>
              <span className="font-semibold text-[#202125]">Release #{version.release_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Target model:</span>
              <span className="text-[#202125]">
                {String(version.snapshot?.model_settings?.model || "Standard")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Published at:</span>
              <span className="text-[#202125]">
                {new Date(version.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <p className="text-[12px] text-[#7A808A]">
            Draft changes in your local editor remain in draft unless saved or published separately.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-[6px] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#EDF0F2]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-[6px] text-[13px] font-medium text-[#202125] bg-white border border-[#E1E5EA] hover:bg-[#F8F9FA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRollback}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#F15A24] text-white text-[13px] font-medium hover:bg-[#C94716] transition-colors disabled:opacity-50 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {loading ? "Restoring..." : `Restore Release #${version.release_number}`}
          </button>
        </div>
      </div>
    </div>
  );
}
