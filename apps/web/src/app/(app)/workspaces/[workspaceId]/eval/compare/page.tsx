import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { getEvaluationRepository } from "@/features/evaluation/lib/repository";
import { VersionComparisonView } from "@/features/evaluation/components/version-comparison-view";
import { EvaluationState } from "@/features/evaluation/components/evaluation-state";

export const metadata = {
  title: "Version Comparison — QuickStart AI",
  description: "Compare pass rates, latency, and regressions between evaluation runs.",
};

interface Props {
  params: {
    workspaceId: string;
  };
  searchParams: {
    baseline?: string;
    candidate?: string;
  };
}

export default async function WorkspaceComparisonPage({
  params,
  searchParams,
}: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getEvaluationRepository(false);

  const runsResult = await repo.listRuns(activeWorkspace.id);

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

  return (
    <div className="w-full">
      <VersionComparisonView
        workspaceId={activeWorkspace.id}
        initialRuns={runsResult.data}
        defaultBaselineId={searchParams.baseline}
        defaultCandidateId={searchParams.candidate}
        isPreview={false}
      />
    </div>
  );
}
