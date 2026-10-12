import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { InboundCallLogs } from "@/features/voice/components/inbound-call-logs";

export const metadata = {
  title: "Inbound Call Logs — Voice — QuickStart AI",
  description: "Review inbound calls and open their transcripts and recordings.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceInboundVoicePage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <InboundCallLogs
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
