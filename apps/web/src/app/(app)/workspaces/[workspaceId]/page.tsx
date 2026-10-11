import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WorkspaceOverview } from "@/features/workspace/components/workspace-overview";

type Props = { params: { workspaceId: string } };

export default async function WorkspaceHomePage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  return <WorkspaceOverview workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} />;
}
