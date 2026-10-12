import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuthenticatedCampaignView } from "@/features/campaigns/components/authenticated-campaign-view";

export const metadata = {
  title: "Call Attempts — Campaigns — QuickStart AI",
  description: "Chronological outbound call attempts for this campaign.",
};

type Props = {
  params: { workspaceId: string; campaignId: string };
};

export default async function CampaignAttemptsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <AuthenticatedCampaignView
        key={`${activeWorkspace.id}-${params.campaignId}-attempts`}
        workspaceId={activeWorkspace.id}
        campaignId={params.campaignId}
        tab="attempts"
      />
    </div>
  );
}
