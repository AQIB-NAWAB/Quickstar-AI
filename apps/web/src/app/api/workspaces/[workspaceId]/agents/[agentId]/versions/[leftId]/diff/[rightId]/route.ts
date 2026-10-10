import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = {
  params: {
    workspaceId: string;
    agentId: string;
    leftId: string;
    rightId: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, agentId, leftId, rightId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/versions/${encodeURIComponent(leftId)}/diff/${encodeURIComponent(rightId)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
