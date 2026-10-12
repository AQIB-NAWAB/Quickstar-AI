import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { CampaignList } from "@/features/campaigns/components/campaign-list";

export const metadata = {
  title: "Campaigns — QuickStart AI",
  description: "Create outbound calling campaigns and follow their progress.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceCampaignsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <CampaignList
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
