import { CampaignsPageView } from "@/features/campaigns/components/campaigns-page-view";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Campaigns — QuickStart AI",
  description: "Create and supervise voice and email campaigns from one workspace.",
};

type Props = {
  params: { workspaceId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function WorkspaceCampaignsPage({ params, searchParams }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <CampaignsPageView
      key={activeWorkspace.id}
      workspaceId={activeWorkspace.id}
      initialChannel={
        searchParams?.channel === "email" ? "email" : "voice"
      }
    />
  );
}
