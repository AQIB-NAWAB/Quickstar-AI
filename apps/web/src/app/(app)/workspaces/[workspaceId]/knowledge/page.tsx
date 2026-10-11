import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { KnowledgeSourceList } from "@/features/knowledge/components/knowledge-source-list";

type Props = { params: { workspaceId: string } };

export default async function WorkspaceKnowledgePage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <KnowledgeSourceList key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
    </div>
  );
}
