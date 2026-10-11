"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { updateWorkspace } from "../lib/client";
import { getWorkspaceInitials } from "../lib/format";
import type { WorkspaceData } from "../lib/types";

interface GeneralSettingsProps {
  workspaceId: string;
  initialWorkspace: WorkspaceData;
  canUpdate: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onWorkspaceUpdated?: (updated: WorkspaceData) => void;
}

export function GeneralSettings({
  workspaceId,
  initialWorkspace,
  canUpdate,
  onDirtyChange,
  onWorkspaceUpdated,
}: GeneralSettingsProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceData>(initialWorkspace);

  const [nameDraft, setNameDraft] = useState(initialWorkspace.name);
  const [slugDraft, setSlugDraft] = useState(initialWorkspace.slug);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDirty =
    nameDraft.trim() !== workspace.name.trim() ||
    slugDraft.trim() !== workspace.slug.trim();

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function handleCancel() {
    setNameDraft(workspace.name);
    setSlugDraft(workspace.slug);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canUpdate || !isDirty) return;

    const trimmedName = nameDraft.trim();
    const trimmedSlug = slugDraft.trim();

    if (!trimmedName) {
      setError("Workspace name is required.");
      return;
    }

    if (!trimmedSlug) {
      setError("Workspace slug is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const res = await updateWorkspace(workspaceId, {
      name: trimmedName,
      slug: trimmedSlug,
    });
    setIsSaving(false);

    if (res.workspace) {
      setWorkspace(res.workspace);
      setNameDraft(res.workspace.name);
      setSlugDraft(res.workspace.slug);
      setSuccessMessage("Workspace updated.");
      onWorkspaceUpdated?.(res.workspace);
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setError(res.error?.message || "Failed to update workspace.");
    }
  }

  const initials = getWorkspaceInitials(workspace.name);

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-bold text-accent-black tracking-tight">
          General
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Workspace details and identity.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Workspace Avatar */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-accent-black">
            Workspace avatar
          </label>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full bg-neutral-200/80 text-neutral-600 flex items-center justify-center font-bold text-sm tracking-wide select-none shrink-0"
              aria-label={`Workspace avatar: ${workspace.name}`}
            >
              {initials}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-8 border border-border-faint bg-neutral-50 text-neutral-400 text-xs font-medium inline-flex items-center gap-1.5 cursor-not-allowed opacity-70"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload logo</span>
              </button>
              <p className="text-[11px] text-neutral-400">
                Logo uploads are not available yet.
              </p>
            </div>
          </div>
        </div>

        {/* Name and Slug Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ws-name" className="block text-xs font-semibold text-accent-black">
              Workspace name
            </label>
            <input
              id="ws-name"
              type="text"
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value);
                if (error) setError(null);
              }}
              disabled={!canUpdate || isSaving}
              className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ws-slug" className="block text-xs font-semibold text-accent-black">
              Workspace slug
            </label>
            <input
              id="ws-slug"
              type="text"
              value={slugDraft}
              onChange={(e) => {
                setSlugDraft(e.target.value);
                if (error) setError(null);
              }}
              disabled={!canUpdate || isSaving}
              className="w-full font-mono rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow disabled:opacity-60"
            />
          </div>
        </div>

        {/* Description Field (Unavailable in backend) */}
        <div className="space-y-1.5">
          <label htmlFor="ws-description" className="block text-xs font-semibold text-accent-black">
            Description
          </label>
          <textarea
            id="ws-description"
            rows={3}
            disabled
            value=""
            placeholder="Description is not available yet."
            className="w-full rounded-10 border border-border-faint bg-neutral-50 px-3 py-2 text-xs text-neutral-400 placeholder:text-neutral-400 cursor-not-allowed resize-none"
          />
        </div>

        {/* Alerts */}
        {error ? (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="p-3 bg-green-50 border border-green-200 rounded-10 text-xs text-[#16A34A] font-medium"
          >
            {successMessage}
          </div>
        ) : null}

        {/* Footer Actions */}
        {canUpdate ? (
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!isDirty || isSaving}
              className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
