import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { DatasetList } from "@/features/evaluation/components/dataset-list";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Evaluation Datasets — QuickStart AI",
  description: "Manage test datasets and benchmarks for agent evaluation.",
};

interface Props {
  params: {
    workspaceId: string;
  };
}

export default async function WorkspaceDatasetsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const [datasetsResult, overviewResult] = await Promise.all([
    repo.listDatasets(activeWorkspace.id),
    repo.getOverview(activeWorkspace.id, "all").catch(() => null),
  ]);

  if (datasetsResult.status !== "ready") {
    return (
      <div className="w-full">
        <EvaluationState
          status={datasetsResult.status}
          message={datasetsResult.message}
        />
      </div>
    );
  }

  const summary =
    overviewResult && overviewResult.status === "ready"
      ? overviewResult.data.summary
      : undefined;

  return (
    <div className="w-full">
      <DatasetList
        workspaceId={activeWorkspace.id}
        datasets={datasetsResult.data}
        summary={summary}
        isPreview={false}
      />
    </div>
  );
}
