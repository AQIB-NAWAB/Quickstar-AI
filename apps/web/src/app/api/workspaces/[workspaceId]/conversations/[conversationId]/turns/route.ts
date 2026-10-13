import { NextResponse } from "next/server";
import { gatewayBaseUrl, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; conversationId: string } };

export async function POST(request: Request, { params }: Params) {
  const { workspaceId, conversationId } = params;
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/turns`;
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/event-stream")) {
    const token = await getAccessTokenFromCookies();
    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
        { status: 401 },
      );
    }
    const upstream = await fetch(`${gatewayBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body,
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  }

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
