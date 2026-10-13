import { redirect } from "next/navigation";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

export const metadata = {
  title: "Leads — QuickStart AI",
};

type Props = { params: { workspaceId: string } };

export default async function Page({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  redirect(`/workspaces/${encodeURIComponent(activeWorkspace.id)}/leads`);
}

