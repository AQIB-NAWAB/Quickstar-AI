import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowUnavailableState } from "@/features/workflows/components/workflow-unavailable-state";

export const metadata = {
  title: "Run Diagnostics — QuickStart AI",
  description: "View run diagnostic trace and payload details.",
};

type Props = {
  params: { workspaceId: string; workflowId: string; runId: string };
};

export default async function WorkflowRunDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const backUrl = `/workspaces/${encodeURIComponent(activeWorkspace.id)}/workflows/${encodeURIComponent(params.workflowId)}/runs`;

  return (
    <div className="w-full">
      <WorkflowUnavailableState
        backUrl={backUrl}
        title="Run diagnostics are not available yet."
        description="Detailed execution step traces and payload diagnostics require a connected workflow runtime engine."
      />
    </div>
  );
}
