import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; conversationId: string } };

export async function GET(request: Request, { params }: Params) {
  const { workspaceId, conversationId } = params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages${query ? `?${query}` : ""}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request, { params }: Params) {
  const { workspaceId, conversationId } = params;
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    body,
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
