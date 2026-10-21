import { NextResponse } from "next/server";
import { proxyMultipartToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string } };

export async function POST(request: Request, { params }: Params) {
  const { workspaceId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/knowledge/sources/upload`;

  const result = await proxyMultipartToGateway<Record<string, unknown>>(path, request);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, { status: result.status });
}
