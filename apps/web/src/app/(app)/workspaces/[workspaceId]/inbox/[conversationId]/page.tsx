import { ConversationThread } from "@/features/inbox/components/conversation-thread";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

type Props = { params: { workspaceId: string; conversationId: string } };

export default async function InboxConversationPage({ params }: Props) {
  const { me } = await loadWorkspaceShell(params.workspaceId);

  const local = me.user.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Teammate";
  const agentName = local.replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <ConversationThread
      workspaceId={params.workspaceId}
      conversationId={params.conversationId}
      userId={me.user.id}
      agentName={agentName}
    />
  );
}
