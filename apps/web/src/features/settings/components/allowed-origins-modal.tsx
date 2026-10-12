"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { updatePublishableKeyOrigins } from "../lib/client";
import { validateAndNormalizeOrigin } from "../lib/format";
import type { PublishableKeyItem } from "../lib/types";

interface AllowedOriginsModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  publishableKey: PublishableKeyItem;
  onOriginsUpdated: (updated: PublishableKeyItem) => void;
}

export function AllowedOriginsModal({
  open,
  onClose,
  workspaceId,
  publishableKey,
  onOriginsUpdated,
}: AllowedOriginsModalProps) {
  const [origins, setOrigins] = useState<string[]>(
    publishableKey.allowed_origins.length > 0 ? [...publishableKey.allowed_origins] : [""],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigins(
      publishableKey.allowed_origins.length > 0
        ? [...publishableKey.allowed_origins]
        : [""],
    );
    setError(null);
  }, [publishableKey]);

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

  async function handleSave() {
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

    const res = await updatePublishableKeyOrigins(workspaceId, publishableKey.id, normalized);
    setIsSubmitting(false);

    if (res.publishableKey) {
      onOriginsUpdated(res.publishableKey);
      onClose();
    } else {
      setError(res.error?.message || "Failed to update allowed origins.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Allowed origins"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[500px]"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs text-neutral-500">
            Origins allowed for widget key{" "}
            <span className="font-semibold text-accent-black">{publishableKey.name}</span>
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-accent-black">
              Origins ({origins.filter((o) => o.trim()).length})
            </span>
            <button
              type="button"
              onClick={handleAddOriginRow}
              className="text-xs font-medium text-heat-100 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add origin</span>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
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
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save origins"}
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
