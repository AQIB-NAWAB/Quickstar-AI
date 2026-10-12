import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { LiveInboundDashboard } from "@/features/voice/components/live-inbound-dashboard";

export const metadata = {
  title: "Live Inbound Calls — Voice — QuickStart AI",
  description: "Monitor active inbound calls and live transcripts.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceLiveInboundPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <LiveInboundDashboard
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
