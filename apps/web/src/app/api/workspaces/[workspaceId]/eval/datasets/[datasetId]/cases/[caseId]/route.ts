import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; datasetId: string; caseId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, datasetId, caseId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/eval/datasets/${encodeURIComponent(datasetId)}/cases/${encodeURIComponent(caseId)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function PATCH(request: Request, { params }: Params) {
  const { workspaceId, datasetId, caseId } = params;
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/eval/datasets/${encodeURIComponent(datasetId)}/cases/${encodeURIComponent(caseId)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { workspaceId, datasetId, caseId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/eval/datasets/${encodeURIComponent(datasetId)}/cases/${encodeURIComponent(caseId)}`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "DELETE",
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
