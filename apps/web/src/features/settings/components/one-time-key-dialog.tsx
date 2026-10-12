"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";

interface OneTimeKeyDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  keyLabel?: string;
  rawKey: string;
  description?: string;
}

export function OneTimeKeyDialog({
  open,
  onClose,
  title = "Copy your key now",
  keyLabel = "API key",
  rawKey,
  description,
}: OneTimeKeyDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [showUncopiedConfirm, setShowUncopiedConfirm] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopyError("Could not copy automatically. Please select and copy manually.");
    }
  }

  function handleAttemptClose() {
    if (!copied && !showUncopiedConfirm) {
      setShowUncopiedConfirm(true);
      return;
    }
    setShowUncopiedConfirm(false);
    onClose();
  }

  return (
    <SettingsDialog
      open={open}
      onClose={handleAttemptClose}
      title={title}
      maxWidthClass="max-w-[500px]"
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div
          role="alert"
          className="p-3 bg-heat-8 border border-heat-24 rounded-10 flex items-start gap-2.5 text-xs text-amber-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-accent-black">This key will not be shown again.</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {description ||
                "Store this key securely in your environment variables. It cannot be retrieved once you close this dialog."}
            </p>
          </div>
        </div>

        {/* Monospace Raw Key Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-accent-black">
            {keyLabel}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={rawKey}
              className="min-w-0 flex-1 font-mono text-xs bg-neutral-50 border border-border-faint rounded-10 px-3 py-2 text-accent-black select-all focus:outline-none focus:ring-2 focus:ring-heat-24"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {copyError ? (
          <p className="text-xs text-accent-crimson">{copyError}</p>
        ) : null}

        {/* Uncopied Confirmation Warning */}
        {showUncopiedConfirm && !copied ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-10 space-y-2 text-xs text-accent-crimson">
            <p className="font-semibold">You haven't copied this key yet.</p>
            <p className="text-[11px] leading-relaxed text-red-700">
              If you close now, you will never be able to view this key again.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="px-2.5 py-1 rounded-6 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700"
              >
                Copy now
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-6 border border-red-200 bg-white text-accent-crimson text-xs font-semibold hover:bg-red-50"
              >
                Dismiss anyway
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-3 border-t border-border-faint">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-2 rounded-10 bg-accent-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
