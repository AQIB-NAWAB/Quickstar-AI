"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { deleteWorkspace } from "../lib/client";

interface DeleteWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export function DeleteWorkspaceModal({
  open,
  onClose,
  workspaceId,
  workspaceName,
}: DeleteWorkspaceModalProps) {
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExactMatch = confirmInput === workspaceName;

  function handleClose() {
    if (isSubmitting) return;
    setConfirmInput("");
    setError(null);
    onClose();
  }

  async function handleDelete() {
    if (!isExactMatch || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const res = await deleteWorkspace(workspaceId);
    setIsSubmitting(false);

    if (res.success) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      setError(res.error?.message || "Failed to delete workspace.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={handleClose}
      title={`Delete ${workspaceName}?`}
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[480px]"
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-10 flex items-start gap-2.5 text-xs text-accent-crimson">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="text-[11px] leading-relaxed text-red-700">
              You will lose access to this workspace. Deletion cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-ws-name" className="block text-xs font-semibold text-accent-black">
            Type the workspace name to confirm
          </label>
          <input
            id="confirm-ws-name"
            type="text"
            value={confirmInput}
            onChange={(e) => {
              setConfirmInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={workspaceName}
            autoComplete="off"
            className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-shadow"
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
            type="button"
            onClick={() => void handleDelete()}
            disabled={!isExactMatch || isSubmitting}
            className="px-4 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Deleting..." : "Delete workspace"}</span>
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
