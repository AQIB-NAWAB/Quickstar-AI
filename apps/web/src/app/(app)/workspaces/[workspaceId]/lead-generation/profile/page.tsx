import { LeadGenerationProfilePage } from "@/features/lead-generation/components/profile-page";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Lead generation profile — QuickStart AI",
};

type Props = { params: { workspaceId: string } };

export default async function Page({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  return (
    <div className="w-full p-6">
      <LeadGenerationProfilePage workspaceId={activeWorkspace.id} />
    </div>
  );
}
