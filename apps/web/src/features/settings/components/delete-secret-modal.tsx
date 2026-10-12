"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { deleteSecret } from "../lib/client";
import type { SecretItem } from "../lib/types";

interface DeleteSecretModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  secret: SecretItem;
  onDeleted: (name: string) => void;
}

export function DeleteSecretModal({
  open,
  onClose,
  workspaceId,
  secret,
  onDeleted,
}: DeleteSecretModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsSubmitting(true);
    setError(null);

    const res = await deleteSecret(workspaceId, secret.name);
    setIsSubmitting(false);

    if (res.success) {
      onDeleted(secret.name);
      onClose();
    } else {
      setError(res.error?.message || "Failed to delete secret.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Delete secret?"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-accent-crimson flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-mono text-xs font-bold text-accent-black break-words">
              {secret.name}
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Tools using this secret may stop working. This cannot be undone.
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
            onClick={() => void handleDelete()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Delete secret"}
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
