import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { SourceDetails } from "@/features/knowledge/components/source-details";

type Props = {
  params: {
    workspaceId: string;
    sourceId: string;
  };
};

export default async function WorkspaceKnowledgeSourceDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <SourceDetails workspaceId={activeWorkspace.id} sourceId={params.sourceId} />
    </div>
  );
}
