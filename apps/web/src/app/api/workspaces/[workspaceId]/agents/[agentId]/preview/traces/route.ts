import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; agentId: string } };

export async function GET(request: Request, { params }: Params) {
  const { workspaceId, agentId } = params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const limit = url.searchParams.get("limit") || "20";
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/preview/traces?sessionId=${encodeURIComponent(sessionId || "")}&limit=${encodeURIComponent(limit)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "GET",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
