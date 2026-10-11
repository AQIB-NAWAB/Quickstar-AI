"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { updateMemberRole } from "../lib/client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, WORKSPACE_ROLES } from "../lib/permissions";
import type { WorkspaceMember, WorkspaceRole } from "../lib/types";

interface ChangeRoleModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  member: WorkspaceMember;
  currentUserId: string;
  ownerCount: number;
  onRoleChanged: (updated: WorkspaceMember) => void;
}

export function ChangeRoleModal({
  open,
  onClose,
  workspaceId,
  member,
  currentUserId,
  ownerCount,
  onRoleChanged,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>(member.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = member.userId === currentUserId;
  const isDemotingSelf = isSelf && member.role === "owner" && selectedRole !== "owner";
  const isOnlyOwner = member.role === "owner" && ownerCount <= 1;

  async function handleSave() {
    if (selectedRole === member.role) {
      onClose();
      return;
    }

    if (isOnlyOwner && selectedRole !== "owner") {
      setError("Cannot demote the only owner. Assign another owner first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await updateMemberRole(workspaceId, member.userId, selectedRole);
    setIsSubmitting(false);

    if (res.member) {
      onRoleChanged(res.member);
      onClose();
    } else {
      setError(res.error?.message || "Failed to update member role.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Change member role"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[460px]"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">
            Updating access for{" "}
            <span className="font-semibold text-accent-black">
              {member.email || `User (${member.userId.slice(0, 8)}…)`}
            </span>
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="change-role-select" className="block text-xs font-semibold text-accent-black">
            New role
          </label>
          <select
            id="change-role-select"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value as WorkspaceRole);
              if (error) setError(null);
            }}
            disabled={isOnlyOwner}
            className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs font-medium text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-24 transition-shadow disabled:opacity-50"
          >
            {WORKSPACE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-500 pt-1">
            {ROLE_DESCRIPTIONS[selectedRole]}
          </p>
        </div>

        {isOnlyOwner && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-10 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              This workspace has only one owner. You cannot demote the only owner.
            </p>
          </div>
        )}

        {isDemotingSelf && !isOnlyOwner && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-10 flex items-start gap-2.5 text-xs text-accent-crimson">
            <AlertTriangle className="w-4 h-4 text-accent-crimson shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              You are about to remove your own Owner role. You will lose owner permissions and management access immediately.
            </p>
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
            onClick={() => void handleSave()}
            disabled={isSubmitting || selectedRole === member.role || isOnlyOwner}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save role"}
          </button>
        </div>
      </div>
    </SettingsDialog>
  );
}
