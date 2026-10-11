"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { DeleteWorkspaceModal } from "./delete-workspace-modal";

interface DangerZoneProps {
  workspaceId: string;
  workspaceName: string;
  canDeleteWorkspace: boolean;
}

export function DangerZone({
  workspaceId,
  workspaceName,
  canDeleteWorkspace,
}: DangerZoneProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <div className="bg-white border border-red-200/80 rounded-14 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <h2 className="text-base font-bold text-red-600 tracking-tight">
            Danger Zone
          </h2>
        </div>
        <p className="text-xs text-neutral-500">
          Destructive actions that cannot be undone. Please proceed with caution.
        </p>
      </div>

      <div className="pt-4 border-t border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <p className="text-xs font-semibold text-accent-black">Delete workspace</p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Deleting <strong className="font-semibold text-neutral-800">{workspaceName}</strong> cannot be undone.
          </p>
          {!canDeleteWorkspace && (
            <p className="text-[11px] text-amber-600 font-medium">
              Only the workspace Owner has permission to delete this workspace.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!canDeleteWorkspace}
          onClick={() => setDeleteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed text-xs font-semibold transition-colors self-start sm:self-center shrink-0 shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete workspace</span>
        </button>
      </div>

      {deleteModalOpen && (
        <DeleteWorkspaceModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
        />
      )}
    </div>
  );
}
