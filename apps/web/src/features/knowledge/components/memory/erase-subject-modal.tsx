"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface EraseSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectKey: string;
  totalFactsCount: number;
  onConfirmErase: (subjectKey: string) => Promise<boolean>;
}

export function EraseSubjectModal({
  isOpen,
  onClose,
  subjectKey,
  totalFactsCount,
  onConfirmErase,
}: EraseSubjectModalProps) {
  const [isErasing, setIsErasing] = useState(false);
  const [eraseError, setEraseError] = useState<string | null>(null);
  const eraseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isErasing) {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    eraseBtnRef.current?.focus();

    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen, isErasing, onClose]);

  if (!isOpen) return null;

  const factsLabel = totalFactsCount === 1 ? "1 fact" : `${totalFactsCount} facts`;
  const eraseButtonText =
    totalFactsCount === 1 ? "Erase 1 fact" : `Erase all ${totalFactsCount} facts`;

  async function handleErase() {
    setIsErasing(true);
    setEraseError(null);
    try {
      const success = await onConfirmErase(subjectKey);
      if (success) {
        onClose();
      } else {
        setEraseError("Failed to erase subject memory. Please try again.");
      }
    } catch (err) {
      setEraseError(err instanceof Error ? err.message : "Failed to erase subject memory.");
    } finally {
      setIsErasing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="erase-subject-title"
      aria-describedby="erase-subject-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isErasing) onClose();
      }}
    >
      <div className="w-full max-w-[500px] bg-white rounded-[12px] border border-[#EAECF0] shadow-[0_20px_50px_rgba(16,24,40,0.14)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center shrink-0 border border-[#FECDCA]/40">
            <Trash2 className="w-5 h-5 stroke-[2]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isErasing}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[#98A2B3] hover:text-[#667085] hover:bg-[#F2F4F7] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2
            id="erase-subject-title"
            className="text-lg sm:text-xl font-bold text-[#18181B] tracking-tight"
          >
            Erase subject memory?
          </h2>
          <p id="erase-subject-desc" className="text-sm text-[#475467] leading-relaxed">
            Permanently delete all {factsLabel} stored for this subject.
          </p>
        </div>

        {/* Context box matching Image 4 */}
        <div className="p-3.5 bg-[#F8F9FB] rounded-[8px] border border-[#EAECF0] space-y-1.5 text-left">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Subject key
          </span>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-sm sm:text-base font-bold text-[#18181B] break-words">
              {subjectKey}
            </span>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467] font-medium border border-[#DCE1E8]">
              {factsLabel} will be deleted
            </span>
          </div>
        </div>

        {/* Supporting text */}
        <div className="space-y-1 text-xs text-[#667085] leading-relaxed">
          <p>Agents will no longer receive these stored facts in future conversations.</p>
          <p>Existing conversation messages will not be deleted.</p>
        </div>

        {/* Warning Callout */}
        <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>This action cannot be undone.</span>
        </div>

        {eraseError && (
          <div role="alert" className="p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-xs text-[#B42318]">
            {eraseError}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-[#EAECF0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isErasing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] border border-[#DCE1E8] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={eraseBtnRef}
            type="button"
            onClick={() => void handleErase()}
            disabled={isErasing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] bg-[#D92D20] hover:bg-[#B42318] text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isErasing ? "Erasing..." : eraseButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
