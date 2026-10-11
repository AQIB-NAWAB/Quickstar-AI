import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuthenticatedCampaignView } from "@/features/campaigns/components/authenticated-campaign-view";

export const metadata = {
  title: "Campaign Overview — Campaigns — QuickStart AI",
  description: "Campaign metrics, pacing limits, and activity.",
};

type Props = {
  params: { workspaceId: string; campaignId: string };
};

export default async function CampaignOverviewPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <AuthenticatedCampaignView
        key={`${activeWorkspace.id}-${params.campaignId}-overview`}
        workspaceId={activeWorkspace.id}
        campaignId={params.campaignId}
        tab="overview"
      />
    </div>
  );
}
