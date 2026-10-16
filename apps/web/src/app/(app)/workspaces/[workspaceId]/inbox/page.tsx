import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { EmptyInboxState } from "@/features/inbox/components/empty-inbox-state";

type Props = { params: { workspaceId: string } };

export default async function InboxIndexPage({ params }: Props) {
  await loadWorkspaceShell(params.workspaceId);

  return <EmptyInboxState />;
}
