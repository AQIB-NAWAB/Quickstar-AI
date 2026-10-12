import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { orgId: string; keyId: string } };

export async function DELETE(_request: Request, { params }: Params) {
  const { orgId, keyId } = params;
  const path = `/v1/organizations/${encodeURIComponent(orgId)}/api-keys/${encodeURIComponent(keyId)}`;

  const result = await proxyToGateway<void>(path, {
    method: "DELETE",
  });
  if (!result.ok) {
    return result.response;
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
