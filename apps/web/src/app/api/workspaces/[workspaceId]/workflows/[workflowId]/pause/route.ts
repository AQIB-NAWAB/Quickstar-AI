import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; workflowId: string } };

export async function POST(_request: Request, { params }: Params) {
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/workflows/${encodeURIComponent(params.workflowId)}/pause`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
