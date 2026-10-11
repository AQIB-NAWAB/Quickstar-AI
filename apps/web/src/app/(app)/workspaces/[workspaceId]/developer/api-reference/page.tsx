import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { ApiReference } from "@/features/developer/components/api-reference/api-reference";

export const metadata = {
  title: "API Reference — QuickStart AI",
  description: "Browse public gateway operations and try interactive requests.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceApiReferencePage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <ApiReference
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
