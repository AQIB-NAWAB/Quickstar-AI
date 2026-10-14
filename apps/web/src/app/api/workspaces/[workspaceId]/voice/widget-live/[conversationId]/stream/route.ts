import { NextResponse } from "next/server";
import { gatewayBaseUrl, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";

type Params = { params: { workspaceId: string; conversationId: string } };

export async function GET(_request: Request, { params }: Params) {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
      { status: 401 },
    );
  }
  const url = `${gatewayBaseUrl()}/v1/workspaces/${encodeURIComponent(params.workspaceId)}/voice/widget-live/${encodeURIComponent(params.conversationId)}/stream`;
  const upstream = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
