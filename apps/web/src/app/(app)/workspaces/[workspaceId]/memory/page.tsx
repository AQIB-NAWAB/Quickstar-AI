import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { MemoryFacts } from "@/features/knowledge/components/memory-facts";

type Props = { params: { workspaceId: string } };

export default async function WorkspaceMemoryPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <MemoryFacts key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
    </div>
  );
}
