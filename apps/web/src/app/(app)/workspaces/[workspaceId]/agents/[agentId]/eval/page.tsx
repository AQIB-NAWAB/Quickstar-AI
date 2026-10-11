import { notFound } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { AgentEvaluationPage } from "@/features/evaluation/components/agent-evaluation-page";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Evaluation — QuickStart AI",
  description: "Evaluate published versions against fixed benchmark datasets.",
};

interface Props {
  params: {
    workspaceId: string;
    agentId: string;
  };
}

export default async function WorkspaceAgentEvalPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const result = await repo.getOverview(
    activeWorkspace.id,
    params.agentId
  );

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status !== "ready") {
    return (
      <div className="w-full">
        <EvaluationState
          status={result.status}
          message={result.message}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <AgentEvaluationPage
        workspaceId={activeWorkspace.id}
        agentId={params.agentId}
        initialData={result.data}
        isPreview={false}
      />
    </div>
  );
}
