"use client";

import { useState } from "react";
import { SettingsDialog } from "./settings-dialog";
import { createApiKey } from "../lib/client";
import type { CreateApiKeyResult } from "../lib/types";

interface CreateApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  onKeyCreated: (result: CreateApiKeyResult) => void;
}

export function CreateApiKeyModal({
  open,
  onClose,
  orgId,
  onKeyCreated,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (isSubmitting) return;
    setName("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Key name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createApiKey(orgId, trimmed);
    setIsSubmitting(false);

    if (res.key) {
      onKeyCreated(res.key);
      onClose();
    } else {
      setError(res.error?.message || "Failed to create API key.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={handleClose}
      title="Create API key"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[460px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-neutral-50 border border-border-faint rounded-10 space-y-1">
          <p className="text-xs font-semibold text-accent-black">
            Organization-wide API Key
          </p>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            This key grants programmatic access to resources across your organization.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="api-key-name" className="block text-xs font-semibold text-accent-black">
            Key name
          </label>
          <input
            id="api-key-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Backend integration"
            className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
          />
        </div>

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
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create key"}
          </button>
        </div>
      </form>
    </SettingsDialog>
  );
}
