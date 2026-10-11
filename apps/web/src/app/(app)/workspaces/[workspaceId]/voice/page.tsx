import { redirect } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceVoicePage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  redirect(`/workspaces/${encodeURIComponent(activeWorkspace.id)}/voice/inbound`);
}
