"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { createSecret } from "../lib/client";
import type { SecretItem } from "../lib/types";

interface AddSecretModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  existingSecretNames: string[];
  onSecretSaved: (secret: SecretItem) => void;
}

export function AddSecretModal({
  open,
  onClose,
  workspaceId,
  existingSecretNames,
  onSecretSaved,
}: AddSecretModalProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  useEffect(() => { if (!open) resetForm(); }, [open]);
  const trimmedName = name.trim();
  const alreadyExists = existingSecretNames.includes(trimmedName);

  function resetForm() {
    setName("");
    setValue("");
    setError(null);
    setOverwriteConfirmed(false);
  }

  function handleClose() {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (alreadyExists && !overwriteConfirmed) { setError("Confirm replacement of the existing secret."); return; }
    if (!trimmedName) {
      setError("Secret name is required.");
      return;
    }

    if (trimmedName.length > 128) {
      setError("Secret name must be at most 128 characters.");
      return;
    }

    // Allowed chars: letters, digits, underscores, dots, hyphens, slashes
    if (!/^[a-zA-Z0-9_.\-/]+$/.test(trimmedName)) {
      setError("Secret name can only contain letters, numbers, underscores, dots, hyphens, and slashes.");
      return;
    }

    if (!value) {
      setError("Secret value is required.");
      return;
    }

    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > 8192) {
      setError("Secret value exceeds the 8,192 byte limit.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createSecret(workspaceId, {
      name: trimmedName,
      value,
    });
    setIsSubmitting(false);

    if (res.secret) {
      resetForm();
      onSecretSaved(res.secret);
      onClose();
    } else {
      setError(res.error?.message || "Failed to save secret.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={handleClose}
      title="Add secret"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="secret-name" className="block text-xs font-semibold text-accent-black">
            Name
          </label>
          <input
            id="secret-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
                setOverwriteConfirmed(false);
              if (error) setError(null);
            }}
            placeholder="e.g. OPENAI_API_KEY"
            className="w-full font-mono rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
          />
          <p className="text-[11px] text-neutral-500">
            Letters, numbers, underscores, dots, hyphens, and slashes.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="secret-value" className="block text-xs font-semibold text-accent-black">
            New value
          </label>
          <div className="relative">
            <input
              id="secret-value"
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="••••••••••••••••"
              className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow font-mono"
            />
          </div>
          <p className="text-[11px] text-neutral-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>The stored value cannot be viewed after saving.</span>
          </p>
        </div>

        {alreadyExists ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-10 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              A secret with this name already exists. Saving will replace its stored value.
            </p>
          </div>
        ) : null}

        {alreadyExists && <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={overwriteConfirmed} onChange={e => setOverwriteConfirmed(e.target.checked)} />I confirm replacement of this secret.</label>}

        {error ? (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (alreadyExists && !overwriteConfirmed)}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : alreadyExists
              ? "Replace secret"
              : "Add secret"}
          </button>
        </div>
      </form>
    </SettingsDialog>
  );
}
