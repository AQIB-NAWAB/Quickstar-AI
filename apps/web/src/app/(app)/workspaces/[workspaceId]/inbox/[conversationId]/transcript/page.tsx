import { TranscriptView } from "@/features/inbox/components/transcript-view";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

type Props = { params: { workspaceId: string; conversationId: string } };

export default async function TranscriptPage({ params }: Props) {
  await loadWorkspaceShell(params.workspaceId);

  return <TranscriptView workspaceId={params.workspaceId} conversationId={params.conversationId} />;
}
