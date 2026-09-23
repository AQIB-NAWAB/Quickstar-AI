import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiKeysService } from "../services/api-keys.service.js";
import { readJsonBody } from "../utils/http-request.js";
import { sendJson, sendNoContent } from "../utils/http-response.js";

export async function handleCreateApiKey(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  orgId: string,
  userId: string,
  apiKeys: ApiKeysService,
): Promise<void> {
  const body = await readJsonBody<{ name?: string }>(req);
  const key = await apiKeys.createApiKey(orgId, userId, body.name ?? "");
  sendJson(res, 201, { request_id: requestId, ...key });
}

export async function handleListApiKeys(
  res: ServerResponse,
  requestId: string,
  orgId: string,
  userId: string,
  apiKeys: ApiKeysService,
): Promise<void> {
  const keys = await apiKeys.listApiKeys(orgId, userId);
  sendJson(res, 200, { request_id: requestId, api_keys: keys });
}

export async function handleRevokeApiKey(
  res: ServerResponse,
  orgId: string,
  userId: string,
  keyId: string,
  apiKeys: ApiKeysService,
): Promise<void> {
  await apiKeys.revokeApiKey(orgId, userId, keyId);
  sendNoContent(res);
}
