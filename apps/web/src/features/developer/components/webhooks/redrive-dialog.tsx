"use client";

import { AlertTriangle,RefreshCw,X } from "lucide-react";
import { useState } from "react";

interface RedriveDialogProps {
  deliveryId: string;
  eventType: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RedriveDialog({
  deliveryId,
  eventType,
  isOpen,
  onClose,
  onConfirm,
}: RedriveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onConfirm();
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label="Redrive delivery" className="w-full max-w-md rounded-xl border border-[#ededed] bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-[#fa5d19]" />
            <h2 className="text-base font-bold text-[#262626]">
              Redrive webhook delivery
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#a3a3a3] hover:text-[#262626] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-[#f9f9f9] p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#737373]">Delivery ID:</span>
            <span className="font-mono font-medium text-[#262626]">
              {deliveryId}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#737373]">Event Type:</span>
            <span className="font-mono font-medium text-[#262626]">
              {eventType}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <p>
            Redriving creates a new attempt. Destination endpoints should support
            idempotent handling to prevent duplicate processing side-effects.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#ededed] bg-white px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#262626] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSubmitting ? "animate-spin" : ""}`}
            />
            <span>{isSubmitting ? "Dispatching..." : "Confirm redrive"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
