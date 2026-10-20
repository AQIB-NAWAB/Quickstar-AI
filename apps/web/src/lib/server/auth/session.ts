import { notFound, redirect } from "next/navigation";
import { getAccessTokenFromCookies } from "../gateway/fetch";
import {
  fetchMe,
  listOrgWorkspaces,
  type MeResponse,
  type WorkspaceSummary,
} from "../workspace/workspaces";

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
  if (!me.organizations || me.organizations.length === 0) {
    notFound();
  }

  // Fetch workspaces across all authorized organizations the user belongs to
  const workspaceLists = await Promise.all(
    me.organizations.map((org) => listOrgWorkspaces(accessToken, org.id)),
  );
  const workspaces = workspaceLists.flat();

  const activeWorkspace = workspaces.find((w) => w.id === workspaceId);
  if (!activeWorkspace) {
    notFound();
  }
  return { accessToken, me, workspaces, activeWorkspace };
}
