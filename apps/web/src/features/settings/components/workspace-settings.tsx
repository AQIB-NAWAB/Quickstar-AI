"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { SettingsTabs } from "./settings-tabs";
import { GeneralSettings } from "./general-settings";
import { MembersSettings } from "./members-settings";
import { ApiKeysSettings } from "./api-keys-settings";
import { SecretsSettings } from "./secrets-settings";
import { PublishableKeysSettings } from "./publishable-keys-settings";
import { DangerZone } from "./danger-zone";
import { SettingsDialog } from "./settings-dialog";
import type { SettingsTab, WorkspaceData, WorkspaceRole } from "../lib/types";

interface WorkspaceSettingsProps {
  workspace: WorkspaceData;
  currentUser: {
    id: string;
    email: string;
    role: WorkspaceRole;
  };
  permissions: {
    canUpdateWorkspace: boolean;
    canDeleteWorkspace: boolean;
    canInvite: boolean;
    canUpdateRole: boolean;
    canRemoveMember: boolean;
    canManageSecrets: boolean;
    canManagePublishableKeys: boolean;
  };
}

const VALID_TABS: SettingsTab[] = [
  "general",
  "members",
  "api-keys",
  "secrets",
  "publishable-keys",
  "danger",
];

export function WorkspaceSettings({
  workspace: initialWorkspace,
  currentUser,
  permissions,
}: WorkspaceSettingsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [workspace, setWorkspace] = useState<WorkspaceData>(initialWorkspace);
  const [isGeneralDirty, setIsGeneralDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

  const activeTab = useMemo<SettingsTab>(() => {
    const raw = searchParams.get("tab") as SettingsTab | null;
    if (raw && VALID_TABS.includes(raw)) {
      return raw;
    }
    return "general";
  }, [searchParams]);

  function switchTab(tab: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSelectTab(tab: SettingsTab) {
    if (tab === activeTab) return;

    if (activeTab === "general" && isGeneralDirty) {
      setPendingTab(tab);
      return;
    }

    switchTab(tab);
  }

  function handleConfirmDiscard() {
    if (pendingTab) {
      setIsGeneralDirty(false);
      switchTab(pendingTab);
      setPendingTab(null);
    }
  }

  return (
    <div className="console-feature settings-feature w-full space-y-4">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-accent-black">
          Workspace settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Manage your workspace, team access, and credentials.
        </p>
      </div>

      {/* Tabs navigation */}
      <SettingsTabs activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "general" && (
          <GeneralSettings
            workspaceId={workspace.id}
            initialWorkspace={workspace}
            canUpdate={permissions.canUpdateWorkspace}
            onDirtyChange={setIsGeneralDirty}
            onWorkspaceUpdated={setWorkspace}
          />
        )}

        {activeTab === "members" && (
          <MembersSettings
            key={currentUser.role}
            workspaceId={workspace.id}
            currentUserId={currentUser.id}
            currentUserEmail={currentUser.email}
            currentUserRole={currentUser.role}
            canInvite={permissions.canInvite}
            canUpdateRole={permissions.canUpdateRole}
            canRemoveMember={permissions.canRemoveMember}
          />
        )}

        {activeTab === "api-keys" && (
          <ApiKeysSettings orgId={workspace.orgId} />
        )}

        {activeTab === "secrets" && (
          <SecretsSettings
            workspaceId={workspace.id}
            canManageSecrets={permissions.canManageSecrets}
          />
        )}

        {activeTab === "publishable-keys" && (
          <PublishableKeysSettings
            workspaceId={workspace.id}
            canManagePublishableKeys={permissions.canManagePublishableKeys}
          />
        )}

        {activeTab === "danger" && (
          <DangerZone
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            canDeleteWorkspace={permissions.canDeleteWorkspace}
          />
        )}
      </div>

      {/* Unsaved changes confirmation dialog */}
      {pendingTab && (
        <SettingsDialog
          open={Boolean(pendingTab)}
          onClose={() => setPendingTab(null)}
          title="Unsaved changes"
          maxWidthClass="max-w-[420px]"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                You have unsaved changes in General settings. Switching sections now will discard your changes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingTab(null)}
                className="px-3.5 py-2 rounded-8 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3.5 py-2 rounded-8 bg-red-600 text-white hover:bg-red-700 text-xs font-semibold transition-colors shadow-sm"
              >
                Discard and switch
              </button>
            </div>
          </div>
        </SettingsDialog>
      )}
    </div>
  );
}
