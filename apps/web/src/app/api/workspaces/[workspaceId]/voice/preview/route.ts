import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string } };

export async function POST(request: Request, { params }: Params) {
  const body = await request.text();
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/voice/preview`;
  const result = await proxyToGateway<{
    mime?: string;
    audio_b64?: string;
    latency_ms?: number;
    provider?: string;
    error?: { message?: string };
  }>(path, { method: "POST", body });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
