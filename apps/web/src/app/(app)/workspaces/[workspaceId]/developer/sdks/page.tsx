import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { SdkDocumentation } from "@/features/developer/components/sdk-documentation";

export const metadata = {
  title: "SDK Documentation — QuickStart AI",
  description: "TypeScript and server-side REST integration guide.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceSdkDocsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <SdkDocumentation
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
