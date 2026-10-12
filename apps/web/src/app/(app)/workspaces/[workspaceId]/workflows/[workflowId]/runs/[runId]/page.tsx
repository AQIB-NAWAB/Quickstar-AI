import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowsWorkspaceView } from "@/features/workflows/components/workflows-workspace-view";

export const metadata = {
  title: "Workflow run — QuickStart AI",
  description: "Inspect a single workflow run.",
};

type Props = {
  params: { workspaceId: string; workflowId: string; runId: string };
};

export default async function WorkflowRunDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <WorkflowsWorkspaceView
        workspaceId={activeWorkspace.id}
        view={{ kind: "run", workflowId: params.workflowId, runId: params.runId }}
      />
    </div>
  );
}
