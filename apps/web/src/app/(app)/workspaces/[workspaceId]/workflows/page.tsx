import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowsWorkspaceView } from "@/features/workflows/components/workflows-workspace-view";

export const metadata = {
  title: "Workflows — QuickStart AI",
  description: "Build event-driven automations and follow their execution.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceWorkflowsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <WorkflowsWorkspaceView workspaceId={activeWorkspace.id} view={{ kind: "list" }} />
    </div>
  );
}
