"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Globe, Loader2, Sparkles, X } from "lucide-react";
import { createWorkspace, slugify } from "../lib/client";
import type { OrganizationItem, WorkspaceItem } from "../lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  organizations?: OrganizationItem[];
  defaultOrgId?: string;
  onCreated?: (workspace: WorkspaceItem) => void;
};

export function CreateWorkspaceDialog({
  isOpen,
  onClose,
  organizations = [],
  defaultOrgId,
  onCreated,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    defaultOrgId || organizations[0]?.id || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync default org if options change
  useEffect(() => {
    if (!selectedOrgId && organizations.length > 0) {
      setSelectedOrgId(defaultOrgId || organizations[0]?.id || "");
    }
  }, [organizations, defaultOrgId, selectedOrgId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Auto-slugify when typing name if not manually modified
  function handleNameChange(val: string) {
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  }

  function handleSlugChange(val: string) {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const finalSlug = slug.trim() || slugify(trimmedName);

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter a workspace name (at least 2 characters).");
      return;
    }

    if (!finalSlug || finalSlug.length < 2) {
      setError("Please enter a valid URL slug (at least 2 characters).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createWorkspace({
      name: trimmedName,
      slug: finalSlug,
      orgId: selectedOrgId || undefined,
    });

    if (!res.ok || !res.workspace) {
      setIsSubmitting(false);
      setError(res.error || "Failed to create workspace.");
      return;
    }

    setIsSubmitting(false);
    onClose();

    if (onCreated) {
      onCreated(res.workspace);
    }

    // Direct transition to the newly created real workspace
    router.push(`/workspaces/${res.workspace.id}/agents`);
    router.refresh();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-[500px] bg-white rounded-xl border border-[#E1E5EA] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#EDF0F2] flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF3ED] border border-[#FFE2D4] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#F15A24]" />
            </div>
            <div>
              <h2
                id="create-workspace-title"
                className="text-[17px] font-semibold text-[#202125] leading-tight"
              >
                Create new workspace
              </h2>
              <p className="mt-0.5 text-[13px] text-[#667085]">
                A shared environment for your agents, conversations, and data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-[#98A2B3] hover:text-[#202125] hover:bg-neutral-100 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Organization selector (if multi-org) */}
          {organizations.length > 1 && (
            <div className="space-y-1.5">
              <label
                htmlFor="workspace-org-select"
                className="block text-[13px] font-medium text-[#344054]"
              >
                Organization
              </label>
              <select
                id="workspace-org-select"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#D0D5DD] rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#F15A24]/20 focus:border-[#F15A24] transition-all"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Workspace Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="workspace-name-input"
              className="block text-[13px] font-medium text-[#344054]"
            >
              Workspace name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="workspace-name-input"
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Customer Support AI"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-[14px] bg-white border border-[#D0D5DD] rounded-lg shadow-xs placeholder:text-[#98A2B3] focus:outline-hidden focus:ring-2 focus:ring-[#F15A24]/20 focus:border-[#F15A24] transition-all"
            />
          </div>

          {/* Workspace Slug */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="workspace-slug-input"
                className="block text-[13px] font-medium text-[#344054]"
              >
                Workspace URL identifier
              </label>
              {isSlugManuallyEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSlugManuallyEdited(false);
                    setSlug(slugify(name));
                  }}
                  className="text-[11px] text-[#F15A24] hover:underline"
                >
                  Reset to name
                </button>
              )}
            </div>

            <div className="relative flex items-center rounded-lg border border-[#D0D5DD] bg-white shadow-xs focus-within:border-[#F15A24] focus-within:ring-2 focus-within:ring-[#F15A24]/20">
              <span className="pl-3 pr-1 text-[13px] text-[#667085] select-none font-mono">
                /workspaces/
              </span>
              <input
                id="workspace-slug-input"
                type="text"
                required
                maxLength={40}
                placeholder="customer-support-ai"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full py-2 pr-3 text-[14px] font-mono text-[#202125] placeholder:text-[#98A2B3] focus:outline-hidden bg-transparent"
              />
            </div>
            <p className="text-[12px] text-[#667085]">
              Used in dashboard URLs and API tenant references. Lowercase letters, numbers, and
              hyphens.
            </p>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#EDF0F2] flex items-start gap-2.5 text-[12px] text-[#667085]">
            <Sparkles className="w-4 h-4 text-[#F15A24] shrink-0 mt-0.5" />
            <span>
              You will automatically become the <strong>Owner</strong> of this workspace with full
              permissions to invite team members and publish agents.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#EDF0F2] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[14px] font-medium text-[#344054] bg-white border border-[#D0D5DD] rounded-lg shadow-xs hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold text-white bg-[#F15A24] hover:bg-[#D94B1B] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? "Creating..." : "Create workspace"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
