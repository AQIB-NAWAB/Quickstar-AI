import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; name: string } };

export async function PUT(_request: Request, { params }: Params) {
  const { workspaceId, name } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/secrets/${encodeURIComponent(name)}/rotate`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "PUT",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
