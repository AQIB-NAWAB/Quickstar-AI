import { redirect } from "next/navigation";
import { getAccessTokenFromCookies } from "./gateway-server";
import { fetchMe, listOrgWorkspaces, type MeResponse, type WorkspaceSummary } from "./workspaces";

export async function requireAccessToken(): Promise<string> {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    redirect("/login");
  }
  return token;
}

export async function loadWorkspaceShell(workspaceId: string): Promise<{
  accessToken: string;
  me: MeResponse;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary;
}> {
  const accessToken = await requireAccessToken();
  const me = await fetchMe(accessToken);
  if (!me) {
    redirect("/login");
  }
  const orgId = me.organizations[0]?.id;
  if (!orgId) {
    redirect("/login");
  }
  const workspaces = await listOrgWorkspaces(accessToken, orgId);
  const activeWorkspace = workspaces.find((w) => w.id === workspaceId);
  if (!activeWorkspace) {
    redirect("/login");
  }
  return { accessToken, me, workspaces, activeWorkspace };
}
