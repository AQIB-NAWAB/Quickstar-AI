import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuditList } from "@/features/audit/components/audit-list";

export const metadata = {
  title: "Audit Log — QuickStart AI",
  description: "Review workspace activity and changes.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceAuditPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <AuditList
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
