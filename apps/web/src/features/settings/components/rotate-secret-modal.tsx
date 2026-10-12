"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { rotateSecret } from "../lib/client";
import type { SecretItem } from "../lib/types";

interface RotateSecretModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  secret: SecretItem;
  onRotated: (updated: SecretItem) => void;
}

export function RotateSecretModal({
  open,
  onClose,
  workspaceId,
  secret,
  onRotated,
}: RotateSecretModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRotate() {
    setIsSubmitting(true);
    setError(null);

    const res = await rotateSecret(workspaceId, secret.name);
    setIsSubmitting(false);

    if (res.secret) {
      onRotated(res.secret);
      onClose();
    } else {
      setError(res.error?.message || "Failed to rotate secret.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Rotate secret"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-heat-12 text-heat-100 flex items-center justify-center shrink-0">
            <RotateCw className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-mono text-xs font-bold text-accent-black break-words">
              {secret.name}
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Re-encrypt the stored secret using the vault's configured encryption key. The secret value is unchanged.
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
            onClick={() => void handleRotate()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isSubmitting ? "Re-encrypting..." : "Rotate secret"}
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
