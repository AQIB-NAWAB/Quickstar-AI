import { LeadSchemaEditor } from "@/features/leads/components/lead-schema-editor";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Lead schema — QuickStart AI",
};

type Props = { params: { workspaceId: string } };

export default async function Page({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  return (
    <div className="w-full p-6">
      <LeadSchemaEditor workspaceId={activeWorkspace.id} />
    </div>
  );
}
