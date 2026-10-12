import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuthenticatedCampaignView } from "@/features/campaigns/components/authenticated-campaign-view";

export const metadata = {
  title: "Campaign Contacts — Campaigns — QuickStart AI",
  description: "View audience contacts, statuses, and attempts.",
};

type Props = {
  params: { workspaceId: string; campaignId: string };
};

export default async function CampaignContactsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <AuthenticatedCampaignView
        key={`${activeWorkspace.id}-${params.campaignId}-contacts`}
        workspaceId={activeWorkspace.id}
        campaignId={params.campaignId}
        tab="contacts"
      />
    </div>
  );
}
