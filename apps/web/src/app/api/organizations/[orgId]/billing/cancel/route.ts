import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { orgId: string } };

export async function POST(request: Request, { params }: Params) {
  const { orgId } = params;
  const body = await request.text();
  const path = `/v1/organizations/${encodeURIComponent(orgId)}/billing/cancel`;

  const result = await proxyToGateway<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
