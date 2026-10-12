"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { listMembers } from "../lib/client";
import { ROLE_LABELS } from "../lib/permissions";
import { formatDate } from "../lib/format";
import { InviteMemberModal } from "./invite-member-modal";
import { ChangeRoleModal } from "./change-role-modal";
import { RemoveMemberModal } from "./remove-member-modal";
import type { WorkspaceMember, WorkspaceRole } from "../lib/types";

interface MembersSettingsProps {
  workspaceId: string;
  currentUserId: string;
  currentUserEmail: string;
  currentUserRole: WorkspaceRole;
  canInvite: boolean;
  canUpdateRole: boolean;
  canRemoveMember: boolean;
}

export function MembersSettings({
  workspaceId,
  currentUserId,
  currentUserEmail,
  currentUserRole,
  canInvite,
  canUpdateRole,
  canRemoveMember,
}: MembersSettingsProps) {
  const router = useRouter();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [changingMember, setChangingMember] = useState<WorkspaceMember | null>(null);
  const [removingMember, setRemovingMember] = useState<WorkspaceMember | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const res = await listMembers(workspaceId);
    setIsLoading(false);

    if (res.members) {
      setMembers(res.members);
    } else {
      setError(res.error?.message || "Failed to load members.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [workspaceId]);

  const isOwner = currentUserRole === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  function handleRoleChanged(updated: WorkspaceMember) {
    if (updated.userId === currentUserId) router.refresh();
    setMembers((prev) =>
      prev.map((m) => (m.userId === updated.userId ? updated : m)),
    );
  }

  function handleMemberRemoved(userId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  return (
    <div className="bg-white border border-border-faint rounded-14 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-accent-black tracking-tight">
            Members & Roles
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage membership and access to this workspace.
          </p>
        </div>

        {canInvite ? (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors self-start shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invite member</span>
          </button>
        ) : null}
      </div>

      <div className="p-3 bg-neutral-50 border border-border-faint rounded-10 text-xs text-neutral-600">
        <span className="font-semibold text-accent-black">Owner-only role updates:</span> Only workspace owners can change member roles.
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-neutral-100 rounded-8" />
          <div className="h-10 bg-neutral-100 rounded-8" />
          <div className="h-10 bg-neutral-100 rounded-8" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-12 text-center space-y-2">
          <p className="text-xs font-semibold text-accent-crimson">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-neutral-300 mx-auto" />
          <p className="text-xs font-semibold text-accent-black">No members found</p>
        </div>
      ) : (
        <div className="border border-border-faint rounded-12 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-neutral-500 font-medium">
                  <th scope="col" className="py-3 px-4 font-semibold">Member</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Role</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Joined</th>
                  <th scope="col" className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {members.map((member) => {
                  const isCurrent = member.userId === currentUserId;
                  const displayName = isCurrent
                    ? currentUserEmail
                    : member.email || "User";
                  const initials = isCurrent
                    ? currentUserEmail.slice(0, 2).toUpperCase()
                    : (member.email || "User").slice(0, 2).toUpperCase();

                  return (
                    <tr key={member.id} className="hover:bg-heat-8/30 transition-colors">
                      {/* Member Info */}
                      <td data-label="Member" className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-neutral-200/80 text-neutral-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-accent-black truncate">
                                {displayName}
                              </span>
                              {isCurrent ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
                                  You
                                </span>
                              ) : null}
                            </div>
                            {!isCurrent ? (
                              <p className="font-mono text-[10px] text-neutral-400 truncate">
                                {member.userId}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td data-label="Role" className="py-3.5 px-4 whitespace-nowrap">
                        {isOwner && canUpdateRole ? (
                          <button
                            type="button"
                            onClick={() => setChangingMember(member)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-8 border border-border-faint bg-white hover:bg-neutral-50 text-xs font-semibold text-accent-black transition-colors"
                          >
                            <span>{ROLE_LABELS[member.role] || member.role}</span>
                            <span className="text-[10px] text-neutral-400 font-normal">Change</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td data-label="Joined" className="py-3.5 px-4 whitespace-nowrap text-neutral-500">
                        {formatDate(member.createdAt)}
                      </td>

                      {/* Actions */}
                      <td data-label="Actions" className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canRemoveMember && (
                          <button
                            type="button"
                            onClick={() => setRemovingMember(member)}
                            disabled={member.role === "owner" && ownerCount <= 1}
                            className="p-1.5 rounded-6 text-neutral-400 hover:text-accent-crimson hover:bg-red-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Remove member"
                            aria-label={`Remove member ${member.userId}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          void loadData();
        }}
        workspaceId={workspaceId}
      />

      {/* Change Role Modal */}
      {changingMember ? (
        <ChangeRoleModal
          open={Boolean(changingMember)}
          onClose={() => setChangingMember(null)}
          workspaceId={workspaceId}
          member={changingMember}
          currentUserId={currentUserId}
          ownerCount={ownerCount}
          onRoleChanged={handleRoleChanged}
        />
      ) : null}

      {/* Remove Member Modal */}
      {removingMember ? (
        <RemoveMemberModal
          open={Boolean(removingMember)}
          onClose={() => setRemovingMember(null)}
          workspaceId={workspaceId}
          member={removingMember}
          currentUserId={currentUserId}
          ownerCount={ownerCount}
          onMemberRemoved={handleMemberRemoved}
        />
      ) : null}
    </div>
  );
}
