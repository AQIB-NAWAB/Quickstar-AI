import { AppShell } from "@/components/app/app-shell";
import { loadWorkspaceShell } from "@/lib/auth/session";

type Props = {
  children: React.ReactNode;
  params: { workspaceId: string };
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { me, workspaces, activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <AppShell
      workspaceId={activeWorkspace.id}
      workspaceName={activeWorkspace.name}
      workspaceSlug={activeWorkspace.slug}
      userEmail={me.user.email}
      workspaces={workspaces}
    >
      {children}
    </AppShell>
  );
}
