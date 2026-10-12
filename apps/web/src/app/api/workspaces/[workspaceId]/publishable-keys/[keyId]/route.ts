import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; keyId: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { workspaceId, keyId } = params;
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/publishable-keys/${encodeURIComponent(keyId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
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
  const { workspaceId, keyId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/publishable-keys/${encodeURIComponent(keyId)}`;

  const result = await proxyToGateway<void>(path, {
    method: "DELETE",
  });
  if (!result.ok) {
    return result.response;
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
