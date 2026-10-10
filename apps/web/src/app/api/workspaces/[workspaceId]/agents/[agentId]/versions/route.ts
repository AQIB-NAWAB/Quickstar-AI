import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; agentId: string } };

export async function GET(request: Request, { params }: Params) {
  const { workspaceId, agentId } = params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/versions${query ? `?${query}` : ""}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
