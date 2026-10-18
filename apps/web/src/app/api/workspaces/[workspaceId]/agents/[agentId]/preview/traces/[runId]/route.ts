import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; agentId: string; runId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, agentId, runId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/preview/traces/${encodeURIComponent(runId)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "GET",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
