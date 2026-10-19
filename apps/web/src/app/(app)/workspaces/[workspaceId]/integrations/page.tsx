import { IntegrationsDirectory } from "@/features/integrations/components/integrations-directory";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Integrations — QuickStart AI",
  description: "Connect your workspace with third-party tools, calendars, CRM, and voice providers.",
};

export default async function WorkspaceIntegrationsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <IntegrationsDirectory
      workspaceId={activeWorkspace.id}
      workspaceName={activeWorkspace.name}
    />
  );
}
