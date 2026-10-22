import { redirect } from "next/navigation";
import { requireAccessToken } from "@/lib/server/auth/session";
import { fetchMe, listOrgWorkspaces } from "@/lib/server/workspace/workspaces";
import { WorkspacesDirectoryView } from "@/features/workspace/components/workspaces-directory-view";

export const dynamic = "force-dynamic";

export default async function WorkspacesDirectoryPage() {
  const token = await requireAccessToken();
  const me = await fetchMe(token);

  if (!me || !me.organizations?.length) {
    redirect("/login");
  }

  const allWorkspaces = await Promise.all(
    me.organizations.map((org) => listOrgWorkspaces(token, org.id)),
  );

  const flatWorkspaces = allWorkspaces.flat();

  return (
    <WorkspacesDirectoryView
      initialWorkspaces={flatWorkspaces}
      organizations={me.organizations}
      userEmail={me.user.email}
    />
  );
}
