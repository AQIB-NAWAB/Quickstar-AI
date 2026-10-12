import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { OutboundCallDetail } from "@/features/campaigns/components/outbound-call-detail";

export const metadata = {
  title: "Outbound Call Detail — Voice — QuickStart AI",
  description: "Outbound call conversation transcript and metrics.",
};

type Props = {
  params: { workspaceId: string; callId: string };
};

export default async function WorkspaceOutboundCallDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <OutboundCallDetail
        key={`${activeWorkspace.id}-${params.callId}`}
        workspaceId={activeWorkspace.id}
        callId={params.callId}
        isPreview={false}
      />
    </div>
  );
}
