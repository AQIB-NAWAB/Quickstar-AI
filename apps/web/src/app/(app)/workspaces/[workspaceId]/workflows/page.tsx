import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkflowList } from "@/features/workflows/components/workflow-list";

export const metadata = {
  title: "Workflows — QuickStart AI",
  description: "Build event-driven automations and follow their execution.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceWorkflowsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  const base = `/workspaces/${encodeURIComponent(activeWorkspace.id)}/workflows`;

  return (
    <div className="w-full">
      <WorkflowList
        workflows={[]}
        isUnavailable={true}
        newWorkflowUrl={`${base}/new`}
        getWorkflowUrl={(id) => `${base}/${encodeURIComponent(id)}`}
        getRunsUrl={(id) => `${base}/${encodeURIComponent(id)}/runs`}
      />
    </div>
  );
}
