"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { removeMember } from "../lib/client";
import type { WorkspaceMember } from "../lib/types";

interface RemoveMemberModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  member: WorkspaceMember;
  currentUserId: string;
  ownerCount: number;
  onMemberRemoved: (userId: string) => void;
}

export function RemoveMemberModal({
  open,
  onClose,
  workspaceId,
  member,
  currentUserId,
  ownerCount,
  onMemberRemoved,
}: RemoveMemberModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnlyOwner = member.role === "owner" && ownerCount <= 1;

  async function handleRemove() {
    if (isOnlyOwner) {
      setError("Cannot remove the only owner of this workspace.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await removeMember(workspaceId, member.userId);
    setIsSubmitting(false);

    if (res.success) {
      if (member.userId === currentUserId) { router.replace("/dashboard"); router.refresh(); }
      onMemberRemoved(member.userId);
      onClose();
    } else {
      setError(res.error?.message || "Failed to remove member.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Remove member?"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-accent-crimson flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-accent-black break-words">
              {member.email || `User (${member.userId})`}
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              This member will lose access to this workspace. Their user account and organization membership will remain intact.
            </p>
          </div>
        </div>

        {isOnlyOwner && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-10 text-xs text-amber-900 leading-relaxed">
            Cannot remove the only owner of this workspace.
          </div>
        )}

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
            onClick={() => void handleRemove()}
            disabled={isSubmitting || isOnlyOwner}
            className="px-4 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Removing..." : "Remove member"}
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
