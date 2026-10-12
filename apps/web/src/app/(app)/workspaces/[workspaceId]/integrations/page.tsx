import { DeveloperHome } from "@/features/developer/components/developer-home";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Integrations — QuickStart AI",
  description: "Connect to QuickStart AI through APIs, SDKs, and webhooks.",
};

export default async function WorkspaceIntegrationsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return <DeveloperHome workspaceId={activeWorkspace.id} />;
}
