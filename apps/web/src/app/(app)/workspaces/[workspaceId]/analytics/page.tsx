import { ShieldAlert } from "lucide-react";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { gatewayFetch } from "@/lib/server/gateway/fetch";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import {
  roleHasPermission,
  WORKSPACE_PERMISSIONS,
} from "@/features/settings/lib/permissions";
import type { WorkspaceMember } from "@/features/settings/lib/types";

export const metadata = {
  title: "Analytics — QuickStart AI",
  description: "Understand usage, activity, and response performance",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceAnalyticsPage({ params }: Props) {
  const { accessToken, me, activeWorkspace } = await loadWorkspaceShell(
    params.workspaceId,
  );

  // Fetch workspace members to verify membership and permissions
  const membersResult = await gatewayFetch<{ members: WorkspaceMember[] }>(
    `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/members`,
    { accessToken },
  );

  if (!membersResult.ok) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 p-6 bg-white border border-border-faint rounded-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-bold text-accent-black">
          Unable to verify membership
        </h2>
        <p className="text-xs text-neutral-500">
          We could not verify your permissions for this workspace. Please try reloading the page.
        </p>
      </div>
    );
  }

  const members = membersResult.data.members ?? [];
  const currentMember = members.find((m) => m.userId === me.user.id);

  if (!currentMember) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 p-6 bg-white border border-border-faint rounded-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-bold text-accent-black">
          Access restricted
        </h2>
        <p className="text-xs text-neutral-500">
          You are not currently registered as an active member of this workspace.
        </p>
      </div>
    );
  }

  const canReadAnalytics = roleHasPermission(
    currentMember.role,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
  );

  if (!canReadAnalytics) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 p-6 bg-white border border-border-faint rounded-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-bold text-accent-black">
          Permission required
        </h2>
        <p className="text-xs text-neutral-500">
          Your role (<strong className="font-semibold text-neutral-700">{currentMember.role}</strong>) does not have permission to view workspace analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnalyticsDashboard key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
    </div>
  );
}
