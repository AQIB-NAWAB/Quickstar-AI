import { proxyBinaryToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; callId: string } };

export async function GET(request: Request, { params }: Params) {
  const { workspaceId, callId } = params;
  const query = new URL(request.url).search;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/${encodeURIComponent(callId)}/recording${query}`;
  return proxyBinaryToGateway(path, request.headers.get("range"));
}
