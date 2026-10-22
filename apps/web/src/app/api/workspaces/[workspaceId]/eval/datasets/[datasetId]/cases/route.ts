import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; datasetId: string } };

export async function GET(request: Request, { params }: Params) {
  const { workspaceId, datasetId } = params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/eval/datasets/${encodeURIComponent(datasetId)}/cases${query ? `?${query}` : ""}`;

  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request, { params }: Params) {
  const { workspaceId, datasetId } = params;
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/eval/datasets/${encodeURIComponent(datasetId)}/cases`;

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
