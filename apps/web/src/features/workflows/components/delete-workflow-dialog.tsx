"use client";

import { Trash2 } from "lucide-react";

interface DeleteWorkflowDialogProps {
  open: boolean;
  workflowName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteWorkflowDialog({
  open,
  workflowName,
  onConfirm,
  onCancel,
}: DeleteWorkflowDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white rounded-12 border border-border-faint shadow-xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-accent-black tracking-tight">
              Delete workflow?
            </h3>
            <p className="text-xs text-neutral-500 leading-normal">
              Are you sure you want to delete <span className="font-semibold text-accent-black">{workflowName}</span>? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-faint">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-6 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-6 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete workflow
          </button>
        </div>
      </div>
    </div>
  );
}
