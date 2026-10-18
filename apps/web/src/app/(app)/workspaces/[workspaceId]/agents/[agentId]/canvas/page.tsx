import { notFound } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { gatewayFetch, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";
import { AgentCanvasEditor } from "@/features/agents/canvas/components/agent-canvas-editor";
import type { Agent } from "@/features/agents/lib/types";
import type { AgentGraph } from "@quickstart/contracts";

type Props = {
  params: {
    workspaceId: string;
    agentId: string;
  };
};

export default async function AgentCanvasPage({ params }: Props) {
  const { activeWorkspace, accessToken } = await loadWorkspaceShell(params.workspaceId);
  const token = await getAccessTokenFromCookies();

  const [agentResult, graphResult] = await Promise.all([
    gatewayFetch<{ agent: Agent }>(
      `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/agents/${encodeURIComponent(params.agentId)}`,
      { accessToken: token },
    ),
    gatewayFetch<{ graph: AgentGraph | null; draft_revision: number; builder_mode: "legacy" | "canvas" }>(
      `/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/agents/${encodeURIComponent(params.agentId)}/graph`,
      { accessToken: token },
    ),
  ]);

  if (!agentResult.ok || !agentResult.data?.agent) {
    notFound();
  }

  const agent = agentResult.data.agent;
  const graph = graphResult.ok ? graphResult.data.graph : null;
  if (!graphResult.ok) throw new Error("Could not load the agent canvas. Reload to retry; the saved graph has not been replaced.");
  const revision = graphResult.data.draft_revision ?? agent.version;
  const versionsResult = agent.production_version_id ? await gatewayFetch<{ version: { release_number: number } }>(`/v1/workspaces/${encodeURIComponent(activeWorkspace.id)}/agents/${encodeURIComponent(agent.id)}/versions/${encodeURIComponent(agent.production_version_id)}`, { accessToken }) : null;
  const publishedRelease = versionsResult?.ok ? versionsResult.data.version.release_number : null;

  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
      <AgentCanvasEditor
        workspaceId={activeWorkspace.id}
        agentId={agent.id}
        agentName={agent.name}
        initialRevision={revision}
        initialPublishedRelease={publishedRelease}
        initialGraph={graph}
        initialTools={agent.tools}
        initialInstructions={agent.instructions}
        initialModelSettings={agent.model_settings}
        initialChannels={agent.channels}
        initialVoiceSettings={agent.voice}
      />
    </div>
  );
}
