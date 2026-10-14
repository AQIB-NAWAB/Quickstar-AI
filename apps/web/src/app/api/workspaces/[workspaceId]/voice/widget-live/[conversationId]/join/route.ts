import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; conversationId: string } };

export async function POST(request: Request, { params }: Params) {
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/voice/widget-live/${encodeURIComponent(params.conversationId)}/join`;
  const result = await proxyToGateway<Record<string, unknown>>(path, { method: "POST", body });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
