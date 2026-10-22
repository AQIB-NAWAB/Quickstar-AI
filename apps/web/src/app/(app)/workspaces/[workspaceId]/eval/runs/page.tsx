import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { RunHistory } from "@/features/evaluation/components/run-history";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Evaluation Runs — QuickStart AI",
  description: "View evaluation benchmark run history, pass rates, and latencies.",
};

interface Props {
  params: {
    workspaceId: string;
  };
}

export default async function WorkspaceRunsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const [runsResult, datasetsResult] = await Promise.all([
    repo.listRuns(activeWorkspace.id),
    repo.listDatasets(activeWorkspace.id).catch(() => null),
  ]);

  if (runsResult.status !== "ready") {
    return (
      <div className="w-full">
        <EvaluationState
          status={runsResult.status}
          message={runsResult.message}
        />
      </div>
    );
  }

  const datasets =
    datasetsResult && datasetsResult.status === "ready"
      ? datasetsResult.data
      : [];

  return (
    <div className="w-full">
      <RunHistory
        workspaceId={activeWorkspace.id}
        runs={runsResult.data}
        datasets={datasets}
        isPreview={false}
        isCompact={false}
      />
    </div>
  );
}
