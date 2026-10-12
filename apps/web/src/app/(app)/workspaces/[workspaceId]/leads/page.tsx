import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { LeadsPage } from "@/features/leads/components/leads-page";

export const metadata = {
  title: "Leads — QuickStart AI",
  description: "Review captured contacts, intent, and qualification.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceLeadsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <LeadsPage
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        workspaceSlug={activeWorkspace.slug}
        isSampleData={false}
      />
    </div>
  );
}
