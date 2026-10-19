import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { MemoryWorkspace } from "@/features/knowledge/components/memory/memory-workspace";

type Props = { params: { workspaceId: string } };

export default async function WorkspaceMemoryPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <MemoryWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
    </div>
  );
}
