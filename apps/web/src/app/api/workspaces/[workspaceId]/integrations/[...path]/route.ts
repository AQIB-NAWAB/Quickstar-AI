import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; path: string[] } };

export async function GET(request: Request, { params }: Params) {
  const subpath = params.path.join("/");
  const url = new URL(request.url);

  // Browser OAuth redirect callback flow:
  // e.g. GET /api/workspaces/[workspaceId]/integrations/[provider]/callback?code=...&state=...
  if (params.path.length === 2 && params.path[1] === "callback") {
    const provider = params.path[0];
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    const targetUrl = new URL(`/workspaces/${encodeURIComponent(params.workspaceId)}/settings/integrations`, url.origin);

    if (error) {
      targetUrl.searchParams.set("error", errorDescription || error);
      return NextResponse.redirect(targetUrl.toString());
    }

    if (!state || !code) {
      targetUrl.searchParams.set("error", "Missing OAuth authorization code or state token");
      return NextResponse.redirect(targetUrl.toString());
    }

    // Server-side token exchange via gateway
    const callbackPath = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/integrations/${encodeURIComponent(provider)}/callback`;
    const result = await proxyToGateway<Record<string, unknown>>(callbackPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    });

    if (!result.ok) {
      targetUrl.searchParams.set("error", "Failed to complete provider authorization");
      return NextResponse.redirect(targetUrl.toString());
    }

    targetUrl.searchParams.set("connected", provider);
    return NextResponse.redirect(targetUrl.toString());
  }

  const qs = url.searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/integrations/${subpath}${qs ? `?${qs}` : ""}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request, { params }: Params) {
  const subpath = params.path.join("/");
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/integrations/${subpath}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Params) {
  const subpath = params.path.join("/");
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/integrations/${subpath}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "DELETE",
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
