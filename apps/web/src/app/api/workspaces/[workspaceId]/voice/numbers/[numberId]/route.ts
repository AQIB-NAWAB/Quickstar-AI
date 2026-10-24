import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; numberId: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { workspaceId, numberId } = params;
  const body = await request.json().catch(() => ({}));
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/voice/numbers/${encodeURIComponent(
    numberId,
  )}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(request: Request, { params }: Params) {
  const { workspaceId, numberId } = params;
  const query = new URL(request.url).searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/voice/numbers/${encodeURIComponent(
    numberId,
  )}${query ? `?${query}` : ""}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, { method: "DELETE" });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
