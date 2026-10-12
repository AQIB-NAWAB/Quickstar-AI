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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        className="w-full max-w-md rounded-16 border border-border-faint bg-white p-6 shadow-xl relative"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1 rounded-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-12 bg-heat-12 text-heat-100 flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h3 id="publish-modal-title" className="text-base font-bold text-accent-black">
              Publish Release to Production
            </h3>
            <p className="text-xs text-neutral-500">Agent: {agent.name}</p>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-4 p-3 rounded-10 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              You have unsaved changes in your draft editor. Please save your draft before publishing.
            </span>
          </div>
        )}

        <div className="mt-4 space-y-2 text-xs text-neutral-600">
          <p>
            Publishing creates an <strong>immutable frozen snapshot</strong> of this agent&apos;s current
            prompt instructions, model parameters, and attached tools.
          </p>
          <div className="p-3 rounded-10 bg-neutral-50 border border-border-faint space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Draft Version:</span>
              <span className="font-semibold text-accent-black">v{agent.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Current Live Release:</span>
              <span className="text-accent-black font-semibold">
                {agent.production_version_id ? "Active Release" : "None (First Release)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Channels:</span>
              <span className="text-accent-black">
                {[agent.channels.chat && "Chat", agent.channels.voice && "Voice"]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </span>
            </div>
          </div>
          <p className="text-neutral-500 text-[11px] leading-relaxed">
            All conversational turns via the API Gateway and widget will instantly switch to this
            new published version.
          </p>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-8 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 rounded-8 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors border border-border-faint"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || hasUnsavedChanges}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-8 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors shadow-sm disabled:opacity-50"
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
