import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; conversationId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, conversationId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
