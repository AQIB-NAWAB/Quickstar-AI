"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";

interface RevokeKeyModalProps {
  open: boolean;
  onClose: () => void;
  keyName: string;
  isPublishableKey?: boolean;
  onRevoke: () => Promise<{ success: boolean; error?: string }>;
}

export function RevokeKeyModal({
  open,
  onClose,
  keyName,
  isPublishableKey = false,
  onRevoke,
}: RevokeKeyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    const res = await onRevoke();
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to revoke key.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title={isPublishableKey ? "Revoke publishable key?" : "Revoke API key?"}
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-accent-crimson flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-accent-black break-words">
              {keyName}
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {isPublishableKey
                ? "Website widgets using this key will lose access immediately. This cannot be undone."
                : "Applications using this key will lose access. This cannot be undone."}
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
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Revoking..." : "Revoke key"}
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
