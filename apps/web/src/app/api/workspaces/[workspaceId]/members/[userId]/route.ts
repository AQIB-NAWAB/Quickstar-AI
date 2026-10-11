import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";
import { gatewayFetch, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";

type Params = { params: { workspaceId: string; userId: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { workspaceId, userId } = params;

  // Resolve authenticated session and membership to enforce owner-only policy
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
      { status: 401 },
    );
  }

  const meRes = await gatewayFetch<{ user: { id: string } }>("/v1/me", {
    accessToken: token,
  });
  if (!meRes.ok || !meRes.data?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid session" } },
      { status: 401 },
    );
  }

  const membersRes = await gatewayFetch<{ members: { userId: string; role: string }[] }>(
    `/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
    { accessToken: token },
  );
  if (!membersRes.ok || !membersRes.data?.members) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Could not verify workspace membership" } },
      { status: 403 },
    );
  }

  const caller = membersRes.data.members.find((m) => m.userId === meRes.data.user.id);
  if (!caller || caller.role !== "owner") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owners can change member roles." } },
      { status: 403 },
    );
  }

  // Forward role update
  let body: { role?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Invalid role update" } }, { status: 400 });
  }
  const target = membersRes.data.members.find(member => member.userId === userId);
  if (target?.role === "owner" && body.role !== "owner" && membersRes.data.members.filter(member => member.role === "owner").length <= 1) {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Cannot demote the only workspace owner." } }, { status: 409 });
  }
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { workspaceId, userId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "DELETE",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
