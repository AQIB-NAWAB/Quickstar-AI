"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DiscardChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDiscard: () => void;
  factKey?: string | null;
  actionContext?: "switching-subject" | "switching-fact" | "closing-modal";
}

export function DiscardChangesModal({
  isOpen,
  onClose,
  onConfirmDiscard,
  factKey,
  actionContext = "switching-subject",
}: DiscardChangesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    discardButtonRef.current?.focus();

    // Lock body scroll
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let actionText = "Switching subjects";
  if (actionContext === "switching-fact") {
    actionText = "Switching to edit another fact";
  } else if (actionContext === "closing-modal") {
    actionText = "Closing this dialog";
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-changes-title"
      aria-describedby="discard-changes-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[460px] bg-white rounded-[12px] border border-[#EAECF0] shadow-[0_20px_50px_rgba(16,24,40,0.14)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#FEF0C7] text-[#DC6803] flex items-center justify-center shrink-0 border border-[#FEE4E2]/40">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[#98A2B3] hover:text-[#667085] hover:bg-[#F2F4F7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h2
            id="discard-changes-title"
            className="text-lg font-bold text-[#18181B] tracking-tight"
          >
            Discard unsaved changes?
          </h2>
          <p id="discard-changes-desc" className="text-sm text-[#475467] leading-relaxed">
            Your changes to{" "}
            {factKey ? (
              <span className="font-mono text-xs px-2 py-0.5 rounded-[4px] bg-[#F2F4F7] text-[#344054] font-medium border border-[#DCE1E8]">
                {factKey}
              </span>
            ) : (
              <span className="font-medium text-[#18181B]">this fact</span>
            )}{" "}
            have not been saved. {actionText} will discard them.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-[#EAECF0]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] border border-[#DCE1E8] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F8F9FA] transition-colors"
          >
            Keep editing
          </button>
          <button
            ref={discardButtonRef}
            type="button"
            onClick={onConfirmDiscard}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] bg-[#18181B] hover:bg-[#2E3036] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
