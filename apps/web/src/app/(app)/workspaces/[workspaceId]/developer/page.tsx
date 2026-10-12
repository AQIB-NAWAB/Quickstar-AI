import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { DeveloperHome } from "@/features/developer/components/developer-home";

export const metadata = {
  title: "Developer Portal — QuickStart AI",
  description: "Integrate through the public API and inspect webhook delivery.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceDeveloperPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <DeveloperHome
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
