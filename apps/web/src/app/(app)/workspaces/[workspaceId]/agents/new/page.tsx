import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { CreateAgentForm } from "@/features/agents/components/create-agent-form";

type Props = { params: { workspaceId: string } };

export default async function NewAgentPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <CreateAgentForm workspaceId={activeWorkspace.id} />
    </div>
  );
}
