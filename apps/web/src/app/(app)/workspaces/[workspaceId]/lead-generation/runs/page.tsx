import { LeadGenerationRunsListPage } from "@/features/lead-generation/components/runs-list-page";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Lead generation runs — QuickStart AI",
};

type Props = { params: { workspaceId: string } };

export default async function Page({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  return (
    <div className="w-full p-6">
      <LeadGenerationRunsListPage workspaceId={activeWorkspace.id} />
    </div>
  );
}
