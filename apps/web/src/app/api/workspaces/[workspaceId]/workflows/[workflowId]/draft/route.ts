import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; workflowId: string } };

export async function POST(request: Request, { params }: Params) {
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/workflows/${encodeURIComponent(params.workflowId)}/draft`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function PUT(request: Request, { params }: Params) {
  return POST(request, { params });
}
