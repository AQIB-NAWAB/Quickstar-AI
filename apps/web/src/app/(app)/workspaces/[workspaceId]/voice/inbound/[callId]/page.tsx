import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuthenticatedCallDetailView } from "@/features/voice/components/authenticated-call-detail-view";

export const metadata = {
  title: "Call Details — Voice — QuickStart AI",
  description: "Review recording, transcript, and response-stage timings.",
};

type Props = {
  params: { workspaceId: string; callId: string };
};

export default async function WorkspaceInboundCallDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <AuthenticatedCallDetailView
        key={`${activeWorkspace.id}-${params.callId}`}
        workspaceId={activeWorkspace.id}
        callId={params.callId}
      />
    </div>
  );
}
