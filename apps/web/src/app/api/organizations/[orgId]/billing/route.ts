import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { orgId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { orgId } = params;
  const path = `/v1/organizations/${encodeURIComponent(orgId)}/billing`;

  const result = await proxyToGateway<Record<string, unknown>>(path);
  if (!result.ok) {
    return result.response;
  }
  return NextResponse.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
