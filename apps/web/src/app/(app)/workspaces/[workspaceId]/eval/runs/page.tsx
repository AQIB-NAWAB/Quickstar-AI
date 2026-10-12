import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { RunHistory } from "@/features/evaluation/components/run-history";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Evaluation Runs — QuickStart AI",
  description: "View evaluation benchmark run history and scores.",
};

interface Props {
  params: {
    workspaceId: string;
  };
}

export default async function WorkspaceRunsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const result = await repo.listRuns(activeWorkspace.id);

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
      <RunHistory
        workspaceId={activeWorkspace.id}
        runs={result.data}
        isPreview={false}
        isCompact={false}
      />
    </div>
  );
}
