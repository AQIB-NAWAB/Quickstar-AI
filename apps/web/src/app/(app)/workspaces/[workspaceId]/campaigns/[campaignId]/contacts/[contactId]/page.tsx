import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuthenticatedCampaignView } from "@/features/campaigns/components/authenticated-campaign-view";

export const metadata = {
  title: "Contact History — Campaigns — QuickStart AI",
  description: "Contact dial attempts and outcomes.",
};

type Props = {
  params: { workspaceId: string; campaignId: string; contactId: string };
};

export default async function ContactAttemptHistoryPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <AuthenticatedCampaignView
        key={`${activeWorkspace.id}-${params.campaignId}-contact-${params.contactId}`}
        workspaceId={activeWorkspace.id}
        campaignId={params.campaignId}
        tab="contacts"
        contactId={params.contactId}
      />
    </div>
  );
}
