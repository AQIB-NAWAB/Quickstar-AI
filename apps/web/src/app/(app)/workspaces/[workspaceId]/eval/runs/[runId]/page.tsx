import { notFound } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { RunDetail } from "@/features/evaluation/components/run-detail";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Run Results — QuickStart AI",
  description: "Detailed per-case evaluation results, trace diagnostics, and scores.",
};

interface Props {
  params: {
    workspaceId: string;
    runId: string;
  };
}

export default async function WorkspaceRunDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const result = await repo.getRun(activeWorkspace.id, params.runId);

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
      <RunDetail
        workspaceId={activeWorkspace.id}
        run={result.data.run}
        results={result.data.results}
        isPreview={false}
      />
    </div>
  );
}
