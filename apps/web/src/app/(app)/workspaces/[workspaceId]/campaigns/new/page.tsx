import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { CampaignWizard } from "@/features/campaigns/components/wizard/campaign-wizard";

export const metadata = {
  title: "Create Campaign — Campaigns — QuickStart AI",
  description: "Set up a new outbound voice calling campaign.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function NewCampaignPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <CampaignWizard
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
