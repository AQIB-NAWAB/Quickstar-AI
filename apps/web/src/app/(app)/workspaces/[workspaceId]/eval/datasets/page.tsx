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

  const result = await repo.listDatasets(activeWorkspace.id);

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
      <DatasetList
        workspaceId={activeWorkspace.id}
        datasets={result.data}
        isPreview={false}
      />
    </div>
  );
}
