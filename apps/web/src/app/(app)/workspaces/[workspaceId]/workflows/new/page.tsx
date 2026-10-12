import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowsWorkspaceView } from "@/features/workflows/components/workflows-workspace-view";

export const metadata = {
  title: "New workflow — QuickStart AI",
  description: "Create an event-driven automation.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function NewWorkflowPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <WorkflowsWorkspaceView workspaceId={activeWorkspace.id} view={{ kind: "new" }} />
    </div>
  );
}
