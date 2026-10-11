import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { OutboundCallsList } from "@/features/campaigns/components/outbound-calls-list";

export const metadata = {
  title: "Outbound Calls — Voice — QuickStart AI",
  description: "Review dialed outbound voice calls and transcripts.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceOutboundCallsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <OutboundCallsList
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
