import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowUnavailableState } from "@/features/workflows/components/workflow-unavailable-state";

export const metadata = {
  title: "New Workflow — QuickStart AI",
  description: "Create an event-driven automation workflow.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function NewWorkflowPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const backUrl = `/workspaces/${encodeURIComponent(activeWorkspace.id)}/workflows`;

  return (
    <div className="w-full">
      <WorkflowUnavailableState backUrl={backUrl} />
    </div>
  );
}
