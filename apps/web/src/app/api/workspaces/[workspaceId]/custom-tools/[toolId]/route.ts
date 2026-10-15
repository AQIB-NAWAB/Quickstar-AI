import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; toolId: string } };

function path(params: Params["params"]): string {
  return `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/custom-tools/${encodeURIComponent(params.toolId)}`;
}

export async function GET(_request: Request, { params }: Params) {
  const result = await proxyToGateway<Record<string, unknown>>(path(params));
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function PATCH(request: Request, { params }: Params) {
  const result = await proxyToGateway<Record<string, unknown>>(path(params), {
    method: "PATCH",
    body: await request.text(),
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Params) {
  const result = await proxyToGateway<Record<string, unknown>>(path(params), {
    method: "DELETE",
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
