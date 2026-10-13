import { LeadGenerationRunDetailPage } from "@/features/lead-generation/components/run-detail-page";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Lead generation run — QuickStart AI",
};

type Props = { params: { workspaceId: string; runId: string } };

export default async function Page({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  return (
    <div className="w-full p-6">
      <LeadGenerationRunDetailPage workspaceId={activeWorkspace.id} runId={params.runId} />
    </div>
  );
}
