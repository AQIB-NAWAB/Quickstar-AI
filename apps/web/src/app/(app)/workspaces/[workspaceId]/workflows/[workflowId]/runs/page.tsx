import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowUnavailableState } from "@/features/workflows/components/workflow-unavailable-state";

export const metadata = {
  title: "Workflow Runs — QuickStart AI",
  description: "View workflow execution history and run traces.",
};

type Props = {
  params: { workspaceId: string; workflowId: string };
};

export default async function WorkflowRunsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const backUrl = `/workspaces/${encodeURIComponent(activeWorkspace.id)}/workflows/${encodeURIComponent(params.workflowId)}`;

  return (
    <div className="w-full">
      <WorkflowUnavailableState
        backUrl={backUrl}
        title="Execution history is not available yet."
        description="This workspace does not currently have a connected execution history service or telemetry data."
      />
    </div>
  );
}
