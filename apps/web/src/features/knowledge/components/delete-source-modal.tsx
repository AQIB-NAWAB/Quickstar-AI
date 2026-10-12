"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { FeatureDialog } from "./feature-dialog";
import { deleteSource } from "../lib/client";

interface DeleteSourceModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  sourceId: string;
  sourceName: string;
  onDeleted: () => void;
}

export function DeleteSourceModal({
  open,
  onClose,
  workspaceId,
  sourceId,
  sourceName,
  onDeleted,
}: DeleteSourceModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const res = await deleteSource(workspaceId, sourceId);
    setIsDeleting(false);

    if (res.success) {
      onDeleted();
      onClose();
    } else {
      setError(res.error?.message || "Failed to delete knowledge source");
    }
  }

  return (
    <FeatureDialog
      open={open}
      onClose={onClose}
      title="Delete source?"
      isSubmitting={isDeleting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-accent-crimson flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-semibold text-accent-black break-words">
              {sourceName}
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              This deletes the source and schedules removal of its indexed content. This cannot be undone.
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson leading-relaxed"
          >
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
            {isDeleting ? "Deleting..." : "Delete source"}
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
