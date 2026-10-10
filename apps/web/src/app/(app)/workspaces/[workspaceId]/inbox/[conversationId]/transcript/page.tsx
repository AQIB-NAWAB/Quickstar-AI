import { TranscriptView } from "@/components/inbox/transcript-view";
import { loadWorkspaceShell } from "@/lib/auth/session";

type Props = { params: { workspaceId: string; conversationId: string } };

export default async function TranscriptPage({ params }: Props) {
  await loadWorkspaceShell(params.workspaceId);

  return <TranscriptView workspaceId={params.workspaceId} conversationId={params.conversationId} />;
}
