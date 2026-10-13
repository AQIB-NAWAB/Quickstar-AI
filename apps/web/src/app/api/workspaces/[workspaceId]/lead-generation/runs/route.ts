import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string } };

export async function GET(request: Request, { params }: Params) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/lead-generation/runs${qs ? `?${qs}` : ""}`;
  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request, { params }: Params) {
  const body = await request.text();
  const idempotencyKey = request.headers.get("idempotency-key") ?? request.headers.get("Idempotency-Key");
  const path = `/v1/workspaces/${encodeURIComponent(params.workspaceId)}/lead-generation/runs`;
  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
  });
  if (!result.ok) return result.response;
  return NextResponse.json(result.data, { status: result.status });
}
