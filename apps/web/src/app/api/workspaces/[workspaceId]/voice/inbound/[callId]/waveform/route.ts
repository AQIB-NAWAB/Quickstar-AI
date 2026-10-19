import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; callId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, callId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/${encodeURIComponent(callId)}/waveform`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
