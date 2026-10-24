"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { FeatureDialog } from "./feature-dialog";
import { eraseSubjectMemory } from "../lib/client";

interface EraseSubjectModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  subjectKey: string;
  onErased: (deletedCount?: number) => void;
}

export function EraseSubjectModal({
  open,
  onClose,
  workspaceId,
  subjectKey,
  onErased,
}: EraseSubjectModalProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [isErasing, setIsErasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exact match validation (case-sensitive, trimmed)
  const isMatch = confirmInput === subjectKey;

  function handleClose() {
    if (isErasing) return;
    setConfirmInput("");
    setError(null);
    onClose();
  }

  async function handleErase() {
    if (!isMatch || isErasing) return;

    setIsErasing(true);
    setError(null);

    const res = await eraseSubjectMemory(workspaceId, subjectKey);
    setIsErasing(false);

    if (res.success) {
      onErased(res.deletedCount);
      setConfirmInput("");
      onClose();
    } else {
      setError(res.error?.message || "Failed to erase subject memory.");
    }
  }

  return (
    <FeatureDialog
      open={open}
      onClose={handleClose}
      title="Erase subject memory"
      isSubmitting={isErasing}
      maxWidthClass="max-w-[480px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-accent-crimson flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-neutral-600 leading-relaxed">
              This permanently deletes all memory facts for this subject in this workspace.
            </p>
            <p className="text-[11px] text-neutral-500 font-medium">
              This includes facts that are not currently displayed due to read caps.
            </p>
          </div>
        </div>

        <div className="p-3 bg-neutral-50 rounded-10 border border-border-faint space-y-1">
          <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
            Subject key
          </span>
          <p className="font-mono text-xs font-bold text-accent-black break-words">
            {subjectKey}
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <label htmlFor="confirm-subject-input" className="block text-xs font-semibold text-accent-black">
            Type the subject key to confirm
          </label>
          <input
            id="confirm-subject-input"
            type="text"
            value={confirmInput}
            onChange={(e) => {
              setConfirmInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={subjectKey}
            autoComplete="off"
            className="w-full font-mono rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-shadow"
          />
          <p className="text-[11px] text-neutral-400">
            Confirmation is case-sensitive and must match exactly.
          </p>
        </div>

        {error ? (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
          <button
            type="button"
            onClick={handleClose}
            disabled={isErasing}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleErase()}
            disabled={!isMatch || isErasing}
            className="px-4 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isErasing ? "Erasing..." : "Erase memory"}
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
