import { notFound } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { gatewayFetch, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";
import { AgentEditor } from "@/features/agents/components/agent-editor";
import type { Agent } from "@/features/agents/lib/types";
import {
  roleHasPermission,
  WORKSPACE_PERMISSIONS,
} from "@/features/settings/lib/permissions";
import type { WorkspaceMember, WorkspaceRole } from "@/features/settings/lib/types";

type Props = {
  params: {
    workspaceId: string;
    agentId: string;
  };
};

export default async function AgentDetailPage({ params }: Props) {
  const { activeWorkspace, me, accessToken } = await loadWorkspaceShell(params.workspaceId);
  const token = await getAccessTokenFromCookies();

  const [agentResult, membersResult] = await Promise.all([
    gatewayFetch<{ agent: Agent }>(
      `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/agents/${encodeURIComponent(params.agentId)}`,
      { accessToken: token },
    ),
    gatewayFetch<{ members: WorkspaceMember[] }>(
      `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/members`,
      { accessToken },
    ),
  ]);

  if (!agentResult.ok || !agentResult.data?.agent) {
    notFound();
  }

  const members = membersResult.ok ? membersResult.data.members : [];
  const currentMember = members.find((m) => m.userId === me.user.id);
  const role: WorkspaceRole = currentMember?.role ?? "analyst";
  const canManageCustomTools =
    roleHasPermission(role, WORKSPACE_PERMISSIONS.AGENT_CREATE) &&
    roleHasPermission(role, WORKSPACE_PERMISSIONS.AGENT_UPDATE);

  return (
    <div className="w-full">
      <AgentEditor
        workspaceId={activeWorkspace.id}
        initialAgent={agentResult.data.agent}
        canManageCustomTools={canManageCustomTools}
      />
    </div>
  );
}
