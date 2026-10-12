import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowsWorkspaceView } from "@/features/workflows/components/workflows-workspace-view";

export const metadata = {
  title: "Workflow Builder — QuickStart AI",
  description: "Configure workflow triggers, conditions, and actions.",
};

type Props = {
  params: { workspaceId: string; workflowId: string };
};

export default async function WorkflowDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <WorkflowsWorkspaceView
        workspaceId={activeWorkspace.id}
        view={{ kind: "edit", workflowId: params.workflowId }}
      />
    </div>
  );
}
