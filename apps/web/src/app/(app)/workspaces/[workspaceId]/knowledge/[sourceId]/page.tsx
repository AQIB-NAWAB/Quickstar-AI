import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { redirect } from "next/navigation";

type Props = {
  params: {
    workspaceId: string;
    sourceId: string;
  };
};

export default async function WorkspaceKnowledgeSourceDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  redirect(`/workspaces/${activeWorkspace.id}/knowledge?source=${encodeURIComponent(params.sourceId)}`);
}
