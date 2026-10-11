import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; sourceId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, sourceId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/${encodeURIComponent(sourceId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { workspaceId, sourceId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/${encodeURIComponent(sourceId)}`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "DELETE",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
