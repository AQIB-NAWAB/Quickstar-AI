import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowsWorkspaceView } from "@/features/workflows/components/workflows-workspace-view";

export const metadata = {
  title: "Workflow runs — QuickStart AI",
  description: "Inspect workflow execution history.",
};

type Props = {
  params: { workspaceId: string; workflowId: string };
};

export default async function WorkflowRunsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <WorkflowsWorkspaceView
        workspaceId={activeWorkspace.id}
        view={{ kind: "runs", workflowId: params.workflowId }}
      />
    </div>
  );
}
