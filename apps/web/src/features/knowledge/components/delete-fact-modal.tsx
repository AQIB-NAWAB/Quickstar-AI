"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { FeatureDialog } from "./feature-dialog";
import { deleteFact } from "../lib/client";
import type { MemoryFact } from "../lib/types";

interface DeleteFactModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  fact: MemoryFact;
  onDeleted: (factId: string) => void;
}

export function DeleteFactModal({
  open,
  onClose,
  workspaceId,
  fact,
  onDeleted,
}: DeleteFactModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const res = await deleteFact(workspaceId, fact.id);
    setIsDeleting(false);

    if (res.success) {
      onDeleted(fact.id);
      onClose();
    } else {
      setError(res.error?.message || "Failed to delete fact.");
    }
  }

  const excerpt =
    fact.fact_text.length > 120
      ? `${fact.fact_text.slice(0, 120)}…`
      : fact.fact_text;

  return (
    <FeatureDialog
      open={open}
      onClose={onClose}
      title="Delete memory fact?"
      isSubmitting={isDeleting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-accent-crimson flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 min-w-0">
            {fact.fact_key ? (
              <p className="font-mono text-xs font-semibold text-neutral-700">
                {fact.fact_key}
              </p>
            ) : null}
            <p className="text-xs text-neutral-600 italic bg-neutral-50 p-2 rounded-8 border border-border-faint leading-relaxed break-words">
              "{excerpt}"
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed pt-1">
              This permanently deletes this fact. This cannot be undone.
            </p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="px-4 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isDeleting ? "Deleting..." : "Delete fact"}
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
