import { notFound } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { gatewayFetch, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";
import { AgentEditor } from "@/features/agents/components/agent-editor";
import type { Agent } from "@/features/agents/lib/types";

type Props = {
  params: {
    workspaceId: string;
    agentId: string;
  };
};

export default async function AgentDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const token = await getAccessTokenFromCookies();

  const result = await gatewayFetch<{ agent: Agent }>(
    `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/agents/${encodeURIComponent(params.agentId)}`,
    { accessToken: token },
  );

  if (!result.ok || !result.data?.agent) {
    notFound();
  }

  return (
    <div className="w-full">
      <AgentEditor workspaceId={activeWorkspace.id} initialAgent={result.data.agent} />
    </div>
  );
}
