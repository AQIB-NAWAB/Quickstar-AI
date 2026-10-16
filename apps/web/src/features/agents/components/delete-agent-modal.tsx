"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  agentName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteAgentModal({
  isOpen,
  agentName,
  isDeleting,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-agent-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[440px] bg-white rounded-xl border border-[#E1E5EA] shadow-xl overflow-hidden p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-[#B42318] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close"
            className="text-[#667085] hover:text-[#202125] p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h2 id="delete-agent-title" className="text-[17px] font-semibold text-[#202125]">
            Delete agent
          </h2>
          <p className="mt-1.5 text-[13px] text-[#667085] leading-relaxed">
            Are you sure you want to delete <strong className="font-semibold text-[#202125]">{agentName}</strong>? This action cannot be undone and will permanently remove this agent and its configurations.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-[13px] font-medium text-[#202125] bg-white border border-[#E1E5EA] rounded-md hover:bg-[#F8F9FA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#B42318] hover:bg-[#912018] rounded-md transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
