import { proxyBinaryToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; campaignId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, campaignId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/export`;
  return proxyBinaryToGateway(path);
}
