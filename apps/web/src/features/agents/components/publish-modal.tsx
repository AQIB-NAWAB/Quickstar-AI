"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Rocket, X } from "lucide-react";
import type { Agent } from "../lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: Agent;
  hasUnsavedChanges: boolean;
};

export function PublishModal({ isOpen, onClose, onConfirm, agent, hasUnsavedChanges }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handlePublish() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish agent version");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        className="w-full max-w-md rounded-[12px] border border-[#DCE1E8] bg-white p-6 shadow-xl relative animate-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1.5 rounded-[6px] text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FB] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#FFF6F2] text-[#FF571A] flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h3 id="publish-modal-title" className="text-[17px] font-semibold text-[#202125]">
              Publish Release to Production
            </h3>
            <p className="text-[13px] text-[#667085]">Agent: {agent.name}</p>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-4 p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-900 text-[12px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              You have unsaved changes in your editor draft. Save your draft before publishing.
            </span>
          </div>
        )}

        <div className="mt-4 space-y-2.5 text-[13px] text-[#667085] leading-relaxed">
          <p>
            Publishing freezes an immutable snapshot of this agent&apos;s current prompt instructions,
            model parameters, and attached tools.
          </p>
          <div className="p-3.5 rounded-[8px] bg-[#F8F9FB] border border-[#DCE1E8] space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-[#667085]">Draft Version:</span>
              <span className="font-semibold text-[#202125] font-mono">v{agent.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Current Live Release:</span>
              <span className="text-[#202125] font-semibold">
                {agent.production_version_id ? "Active Release" : "None (First Release)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Active Channels:</span>
              <span className="text-[#202125]">
                {[agent.channels.chat && "Website chat", agent.channels.voice && "Phone calls"]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </span>
            </div>
          </div>
          <p className="text-[#7A808A] text-[12px]">
            All conversational turns via website chat and voice channels will immediately switch to
            this new published release.
          </p>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-[6px] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#EDF0F2]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-[#202125] bg-white border border-[#DCE1E8] hover:bg-[#F8F9FB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || hasUnsavedChanges}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#FF571A] text-white text-[13px] font-medium hover:bg-[#E04810] transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              "Publishing..."
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Publish to Production
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
