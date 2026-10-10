import { redirect } from "next/navigation";
import { getAccessTokenFromCookies } from "@/lib/auth/gateway-server";
import { ensureWorkspaceForUser } from "@/lib/auth/workspaces";

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
