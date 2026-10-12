import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { DatasetForm } from "@/features/evaluation/components/dataset-form";

export const metadata = {
  title: "New Dataset — QuickStart AI",
  description: "Create an evaluation benchmark dataset.",
};

interface Props {
  params: {
    workspaceId: string;
  };
}

export default async function NewDatasetPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const handleCreate = async (data: { name: string; description?: string }) => {
    "use server";
    const res = await repo.createDataset(activeWorkspace.id, data);
    if (res.status === "ready") return res.data;
    throw new Error(res.message);
  };

  return (
    <div className="w-full">
      <DatasetForm
        workspaceId={activeWorkspace.id}
        isPreview={false}
        onSubmit={handleCreate}
      />
    </div>
  );
}
