import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; factId: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { workspaceId, factId } = params;
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/memory/facts/${encodeURIComponent(factId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { workspaceId, factId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/memory/facts/${encodeURIComponent(factId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "DELETE",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
