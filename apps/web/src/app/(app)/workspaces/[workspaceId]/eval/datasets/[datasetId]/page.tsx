import { notFound } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { DatasetEditor } from "@/features/evaluation/components/dataset-editor";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Dataset Editor — QuickStart AI",
  description: "Edit test cases and expected outputs for evaluation benchmarks.",
};

interface Props {
  params: {
    workspaceId: string;
    datasetId: string;
  };
}

export default async function WorkspaceDatasetDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const result = await repo.getDataset(activeWorkspace.id, params.datasetId);

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
      <DatasetEditor
        workspaceId={activeWorkspace.id}
        dataset={result.data.dataset}
        initialCases={result.data.cases}
        isPreview={false}
      />
    </div>
  );
}
