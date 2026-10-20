"use client";

import { AlertTriangle } from "lucide-react";

interface DiscardChangesDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscardChangesDialog({
  open,
  title = "Discard unapplied changes?",
  description = "You have unsaved edits in this step. If you switch steps now, those changes will be lost.",
  confirmLabel = "Discard changes",
  cancelLabel = "Keep editing",
  onConfirm,
  onCancel,
}: DiscardChangesDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white rounded-12 border border-border-faint shadow-xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-accent-black tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 leading-normal">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-faint">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-6 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-6 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
