import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { gatewayFetch } from "@/lib/server/gateway/fetch";
import { WorkspaceSettings } from "@/features/settings/components/workspace-settings";
import { roleHasPermission, WORKSPACE_PERMISSIONS } from "@/features/settings/lib/permissions";
import type { WorkspaceMember, WorkspaceRole } from "@/features/settings/lib/types";

export const metadata = {
  title: "Settings — QuickStart AI",
  description: "Workspace settings, team members, credentials, and vault configuration",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceSettingsPage({ params }: Props) {
  const { accessToken, me, activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  // Fetch workspace members to determine current user's role and permissions
  const membersResult = await gatewayFetch<{ members: WorkspaceMember[] }>(
    `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/members`,
    { accessToken },
  );

  const members = membersResult.ok ? membersResult.data.members : [];
  const currentMember = members.find((m) => m.userId === me.user.id);
  if (!membersResult.ok || !currentMember) {
    return (
      <div
        role="alert"
        className="rounded-12 border border-border-faint bg-white p-6 text-sm text-neutral-600"
      >
        Could not load your workspace permissions. Reload this page to try again.
      </div>
    );
  }
  const currentUserRole: WorkspaceRole = currentMember.role;
  const orgId = activeWorkspace.orgId ?? activeWorkspace.org_id;
  if (!orgId) {
    return (
      <div role="alert" className="text-sm text-neutral-600">
        Workspace organization could not be resolved.
      </div>
    );
  }

  const permissions = {
    canUpdateWorkspace: roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.WORKSPACE_UPDATE),
    canDeleteWorkspace: roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.WORKSPACE_DELETE),
    canInvite: roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.MEMBER_INVITE),
    // Role updating is strictly owner-only per F10 specifications
    canUpdateRole: currentUserRole === "owner",
    canRemoveMember: roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.MEMBER_REMOVE),
    canManageSecrets: roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.SECRET_WRITE),
    canManagePublishableKeys: roleHasPermission(
      currentUserRole,
      WORKSPACE_PERMISSIONS.PUBLISHABLE_KEY_MANAGE,
    ),
    canManageCustomTools:
      roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.AGENT_CREATE) &&
      roleHasPermission(currentUserRole, WORKSPACE_PERMISSIONS.AGENT_UPDATE),
  };

  return (
    <WorkspaceSettings
      key={activeWorkspace.id}
      workspace={{
        id: activeWorkspace.id,
        orgId,
        name: activeWorkspace.name,
        slug: activeWorkspace.slug,
      }}
      currentUser={{
        id: me.user.id,
        email: me.user.email,
        role: currentUserRole,
      }}
      permissions={permissions}
    />
  );
}
