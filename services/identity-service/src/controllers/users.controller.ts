import type { ServerResponse } from "node:http";
import type { UsersService } from "../services/users.service.js";
import { sendJson } from "../utils/http-response.js";

export async function handleGetMe(
  res: ServerResponse,
  requestId: string,
  userId: string,
  users: UsersService,
): Promise<void> {
  const profile = await users.getProfile(userId);
  sendJson(res, 200, { request_id: requestId, ...profile });
}
