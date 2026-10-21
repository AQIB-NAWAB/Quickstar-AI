import { proxyBinaryToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; datasetId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { workspaceId, datasetId } = params;
  const path = `/v1/workspaces/${encodeURIComponent(workspaceId)}/eval/datasets/${encodeURIComponent(datasetId)}/export`;
  return proxyBinaryToGateway(path);
}
