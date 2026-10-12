"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { createPublishableKey } from "../lib/client";
import { validateAndNormalizeOrigin } from "../lib/format";
import type { CreatePublishableKeyResult } from "../lib/types";

interface CreatePublishableKeyModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onKeyCreated: (result: CreatePublishableKeyResult) => void;
}

export function CreatePublishableKeyModal({
  open,
  onClose,
  workspaceId,
  onKeyCreated,
}: CreatePublishableKeyModalProps) {
  const [name, setName] = useState("");
  const [origins, setOrigins] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setOrigins([""]);
    setError(null);
  }

  function handleClose() {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }

  function handleOriginChange(index: number, val: string) {
    const next = [...origins];
    next[index] = val;
    setOrigins(next);
    if (error) setError(null);
  }

  function handleAddOriginRow() {
    setOrigins([...origins, ""]);
  }

  function handleRemoveOriginRow(index: number) {
    if (origins.length === 1) {
      setOrigins([""]);
      return;
    }
    setOrigins(origins.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Key name is required.");
      return;
    }

    // Validate origins
    const normalized: string[] = [];
    for (const raw of origins) {
      if (!raw.trim()) continue;
      const res = validateAndNormalizeOrigin(raw);
      if (res.error) {
        setError(`Invalid origin "${raw}": ${res.error}`);
        return;
      }
      if (res.origin && !normalized.includes(res.origin)) {
        normalized.push(res.origin);
      }
    }

    if (normalized.length === 0) {
      setError("At least one valid allowed origin (e.g. https://example.com) is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createPublishableKey(workspaceId, {
      name: trimmedName,
      allowed_origins: normalized,
    });
    setIsSubmitting(false);

    if (res.publishableKey) {
      onKeyCreated(res.publishableKey);
      onClose();
    } else {
      setError(res.error?.message || "Failed to create publishable key.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={handleClose}
      title="Create publishable key"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="pub-key-name" className="block text-xs font-semibold text-accent-black">
            Name
          </label>
          <input
            id="pub-key-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Website widget"
            className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-accent-black">
              Allowed origins
            </label>
            <button
              type="button"
              onClick={handleAddOriginRow}
              className="text-xs font-medium text-heat-100 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add origin</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500">
            Specify the full origin (scheme, domain, port) where the widget is allowed to chat.
          </p>

          <div className="space-y-2">
            {origins.map((orig, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={orig}
                  onChange={(e) => handleOriginChange(idx, e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 font-mono rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-heat-24 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOriginRow(idx)}
                  className="p-2 rounded-8 text-neutral-400 hover:text-accent-crimson hover:bg-red-50 transition-colors"
                  aria-label="Remove origin row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
