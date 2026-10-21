import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; path: string[] } };

export async function GET(request: Request, { params }: Params) {
  const subpath = params.path.join("/");
  const url = new URL(request.url);
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
