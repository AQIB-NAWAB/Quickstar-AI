"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import type { MemoryFact } from "../../lib/types";

interface DeleteFactModalProps {
  isOpen: boolean;
  onClose: () => void;
  fact: MemoryFact;
  totalFactsForSubject: number;
  onConfirmDelete: (factId: string) => Promise<boolean>;
}

export function DeleteFactModal({
  isOpen,
  onClose,
  fact,
  totalFactsForSubject,
  onConfirmDelete,
}: DeleteFactModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDeleting) {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    deleteBtnRef.current?.focus();

    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const otherCount = Math.max(0, totalFactsForSubject - 1);
  const otherText =
    otherCount === 1
      ? "The other 1 fact for this subject will stay available."
      : otherCount === 0
      ? "No other facts are recorded for this subject."
      : `The other ${otherCount} facts for this subject will stay available.`;

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const success = await onConfirmDelete(fact.id);
      if (success) {
        onClose();
      } else {
        setDeleteError("Failed to delete fact. Please try again.");
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete fact.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-fact-title"
      aria-describedby="delete-fact-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-[480px] bg-white rounded-[12px] border border-[#EAECF0] shadow-[0_20px_50px_rgba(16,24,40,0.14)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center shrink-0 border border-[#FECDCA]/40">
            <Trash2 className="w-5 h-5 stroke-[2]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[#98A2B3] hover:text-[#667085] hover:bg-[#F2F4F7] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2
            id="delete-fact-title"
            className="text-lg sm:text-xl font-bold text-[#18181B] tracking-tight"
          >
            Delete this fact?
          </h2>
          <p id="delete-fact-desc" className="text-sm text-[#475467] leading-relaxed">
            This fact will be removed from memory for{" "}
            <span className="font-mono text-xs px-2 py-0.5 rounded-[4px] bg-[#F2F4F7] text-[#344054] font-medium border border-[#DCE1E8]">
              {fact.subject_key}
            </span>
            .
          </p>
        </div>

        {/* Fact Preview Card matching Image 4 */}
        <div className="p-3.5 bg-[#F8F9FB] rounded-[8px] border border-[#EAECF0] space-y-2 text-left">
          {fact.fact_key ? (
            <span className="font-mono text-xs px-2 py-0.5 rounded-[4px] bg-white text-[#344054] font-medium border border-[#DCE1E8] inline-block">
              {fact.fact_key}
            </span>
          ) : (
            <span className="text-xs text-[#667085] italic font-medium inline-block">
              General note
            </span>
          )}
          <p className="text-sm text-[#18181B] leading-relaxed whitespace-pre-wrap break-words">
            {fact.fact_text}
          </p>
        </div>

        <p className="text-xs text-[#667085]">{otherText}</p>

        {/* Warning Callout */}
        <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>This action cannot be undone.</span>
        </div>

        {deleteError && (
          <div role="alert" className="p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-xs text-[#B42318]">
            {deleteError}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-[#EAECF0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] border border-[#DCE1E8] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={deleteBtnRef}
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] bg-[#D92D20] hover:bg-[#B42318] text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isDeleting ? "Deleting..." : "Delete fact"}
          </button>
        </div>
      </div>
    </div>
  );
}
