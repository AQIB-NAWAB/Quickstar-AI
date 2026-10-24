import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string } };

export async function GET(request: Request, { params }: Params) {
  const { workspaceId } = params;
  const query = new URL(request.url).searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/voice/numbers/available${
    query ? `?${query}` : ""
  }`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
