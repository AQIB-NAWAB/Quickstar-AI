import { redirect } from "next/navigation";
import { getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";
import { ensureWorkspaceForUser } from "@/lib/server/workspace/workspaces";

export default async function LegacyDashboardRedirect() {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    redirect("/login");
  }
  const workspaceId = await ensureWorkspaceForUser(token);
  if (workspaceId) {
    redirect(`/workspaces/${workspaceId}`);
  }
  redirect("/login");
}
