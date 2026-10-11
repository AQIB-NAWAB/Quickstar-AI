import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowUnavailableState } from "@/features/workflows/components/workflow-unavailable-state";

export const metadata = {
  title: "Workflow Builder — QuickStart AI",
  description: "Configure workflow triggers, conditions, and actions.",
};

type Props = {
  params: { workspaceId: string; workflowId: string };
};

export default async function WorkflowDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const backUrl = `/workspaces/${encodeURIComponent(activeWorkspace.id)}/workflows`;

  return (
    <div className="w-full">
      <WorkflowUnavailableState backUrl={backUrl} />
    </div>
  );
}
