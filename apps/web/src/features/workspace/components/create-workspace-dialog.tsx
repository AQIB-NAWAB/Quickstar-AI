"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck, X } from "lucide-react";
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

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync default org if options change
  useEffect(() => {
    if (!selectedOrgId && organizations.length > 0) {
      setSelectedOrgId(defaultOrgId || organizations[0]?.id || "");
    }
  }, [organizations, defaultOrgId, selectedOrgId]);

  // Reset form when dialog opens and focus the name input
  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setSlug("");
    setIsSlugManuallyEdited(false);
    setError(null);
    setIsSubmitting(false);

    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Keep keyboard focus inside dialog, trap tab, lock background scroll, and handle Escape
  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const controls = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);

        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) return;

        if (
          e.shiftKey &&
          (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
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

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
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

    try {
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
    } catch (err) {
      setIsSubmitting(false);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred while creating workspace.",
      );
    }
  }

  if (!isOpen) return null;

  const isNameInvalid = Boolean(error && error.toLowerCase().includes("name"));
  const isSlugInvalid = Boolean(
    error && (error.toLowerCase().includes("slug") || error.toLowerCase().includes("url")),
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
      aria-describedby="create-workspace-subtitle"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#101828]/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-[calc(100vw-24px)] sm:w-[calc(100vw-32px)] sm:max-w-[600px] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] bg-white rounded-[12px] border border-[#DCE1E8] shadow-[0_20px_60px_rgba(16,24,40,0.18)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header matching approved design */}
        <div className="pt-5 px-5 pb-4 sm:pt-7 sm:px-7 sm:pb-6 border-b border-[#EAECF0] flex items-start justify-between gap-4 shrink-0 bg-white">
          <div className="min-w-0 pr-1">
            <h2
              id="create-workspace-title"
              className="text-[20px] sm:text-[22px] font-semibold text-[#202125] leading-[28px] tracking-[-0.01em]"
            >
              Create workspace
            </h2>
            <p
              id="create-workspace-subtitle"
              className="mt-2 text-[14px] font-normal text-[#667085] leading-[21px]"
            >
              Keep your agents, conversations, and data in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-[6px] text-[#667085] hover:text-[#202125] hover:bg-[#F2F4F7] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-7 space-y-6">
            {error && (
              <div
                id="create-workspace-error"
                role="alert"
                aria-live="polite"
                className="p-3.5 rounded-[8px] bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-[13px] leading-[20px] flex items-start gap-2.5 shrink-0"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D92D20]" aria-hidden="true" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Organization selector (conditionally visible if multi-org) */}
            {organizations.length > 1 && (
              <div>
                <label
                  htmlFor="workspace-org-select"
                  className="block text-[14px] font-medium text-[#202125] mb-2"
                >
                  Organization
                </label>
                <select
                  id="workspace-org-select"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-[44px] px-3.5 text-[16px] text-[#202125] bg-white border border-[#DCE1E8] rounded-[8px] focus:outline-hidden focus:border-[#FF571A] focus:ring-2 focus:ring-[#FF571A]/15 transition-all disabled:bg-[#F9FAFB] disabled:opacity-60"
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
            <div>
              <label
                htmlFor="workspace-name-input"
                className="block text-[14px] font-medium text-[#202125] mb-2"
              >
                Workspace name
                <span className="text-[#FF571A] ml-1" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                ref={nameInputRef}
                id="workspace-name-input"
                type="text"
                required
                aria-required="true"
                aria-invalid={isNameInvalid || undefined}
                aria-errormessage={isNameInvalid ? "create-workspace-error" : undefined}
                maxLength={60}
                placeholder="e.g. Customer Support AI"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isSubmitting}
                className={`w-full h-[44px] px-3.5 text-[16px] text-[#202125] placeholder:text-[#98A2B3] bg-white border ${
                  isNameInvalid ? "border-[#FDA29B]" : "border-[#DCE1E8]"
                } rounded-[8px] focus:outline-hidden focus:border-[#FF571A] focus:ring-2 focus:ring-[#FF571A]/15 transition-all disabled:bg-[#F9FAFB] disabled:opacity-60`}
              />
            </div>

            {/* Workspace URL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="workspace-slug-input"
                  className="block text-[14px] font-medium text-[#202125]"
                >
                  Workspace URL
                </label>
                {isSlugManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSlugManuallyEdited(false);
                      setSlug(slugify(name));
                    }}
                    disabled={isSubmitting}
                    className="text-[12px] sm:text-[13px] font-medium text-[#FF571A] hover:underline disabled:opacity-50 transition-colors"
                  >
                    Reset to name
                  </button>
                )}
              </div>

              {/* Grouped 1-line prefix and editable slug */}
              <div
                className={`flex items-center w-full min-w-0 h-[44px] rounded-[8px] border ${
                  isSlugInvalid ? "border-[#FDA29B]" : "border-[#DCE1E8]"
                } bg-white overflow-hidden transition-all focus-within:border-[#FF571A] focus-within:ring-2 focus-within:ring-[#FF571A]/15`}
              >
                <div className="shrink-0 whitespace-nowrap h-full flex items-center bg-[#F5F6F8] border-r border-[#DCE1E8] px-2.5 sm:px-3 text-[12px] sm:text-[13px] font-mono text-[#667085] select-none">
                  /workspaces/
                </div>
                <input
                  id="workspace-slug-input"
                  type="text"
                  required
                  aria-required="true"
                  aria-describedby="workspace-slug-helper"
                  aria-invalid={isSlugInvalid || undefined}
                  aria-errormessage={isSlugInvalid ? "create-workspace-error" : undefined}
                  maxLength={40}
                  placeholder="customer-support-ai"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 min-w-0 w-full h-full border-0 outline-hidden bg-transparent px-3 text-[16px] font-mono text-[#202125] placeholder:text-[#98A2B3] disabled:opacity-60"
                />
              </div>
              <p
                id="workspace-slug-helper"
                className="mt-2 text-[13px] leading-[20px] text-[#667085]"
              >
                Use lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* Ownership Note */}
            <div className="flex items-start gap-3 pt-1">
              <ShieldCheck
                className="w-5 h-5 text-[#667085] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-[14px] font-semibold text-[#202125] leading-snug">
                  You’ll be the workspace owner.
                </p>
                <p className="text-[13px] font-normal text-[#667085] leading-relaxed mt-1">
                  You can invite teammates and manage access.
                </p>
              </div>
            </div>
          </div>

          {/* Non-scrolling Footer */}
          <div className="shrink-0 border-t border-[#EAECF0] bg-white py-5 sm:py-6 px-5 sm:px-7">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-[44px] px-[18px] text-[14px] font-medium text-[#344054] bg-white border border-[#DCE1E8] rounded-[8px] hover:bg-[#F9FAFB] hover:border-[#D0D5DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full sm:w-auto h-[44px] px-5 text-[14px] font-semibold text-white bg-[#FF571A] hover:bg-[#EA4E15] active:bg-[#D94510] rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[144px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create workspace</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

