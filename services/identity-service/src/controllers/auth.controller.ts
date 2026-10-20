import type { IncomingMessage, ServerResponse } from "node:http";
import { bearerTokenFromHeader } from "@quickstart/auth";
import type { AuthService } from "../services/auth.service.js";
import { readJsonBody } from "../utils/http-request.js";
import { sendJson, sendNoContent } from "../utils/http-response.js";

export async function handleRegister(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  auth: AuthService,
): Promise<void> {
  const body = await readJsonBody<{
    email?: string;
    password?: string;
    organization_name?: string;
  }>(req);
  const result = await auth.register({
    email: body.email ?? "",
    password: body.password ?? "",
    organizationName: body.organization_name ?? "",
  });
  sendJson(res, 201, { request_id: requestId, ...result });
}

export async function handleLogin(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  auth: AuthService,
): Promise<void> {
  const body = await readJsonBody<{ email?: string; password?: string }>(req);
  const tokens = await auth.login({
    email: body.email ?? "",
    password: body.password ?? "",
  });
  sendJson(res, 200, { request_id: requestId, ...tokens });
}

export async function handleRefresh(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  auth: AuthService,
): Promise<void> {
  const body = await readJsonBody<{ refresh_token?: string }>(req);
  const tokens = await auth.refresh(body.refresh_token ?? "");
  sendJson(res, 200, { request_id: requestId, ...tokens });
}

export async function handleLogout(
  req: IncomingMessage,
  res: ServerResponse,
  auth: AuthService,
): Promise<void> {
  const body = await readJsonBody<{ refresh_token?: string }>(req);
  const token = bearerTokenFromHeader(req.headers.authorization);
  let sessionId: string | undefined;
  if (token) {
    try {
      const session = await auth.validateAccessToken(token);
      sessionId = session.sessionId;
    } catch {
      /* logout with refresh token only */
    }
  }
  await auth.logout({ refreshToken: body.refresh_token, sessionId });
  sendNoContent(res);
}

export async function handleForgotPassword(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  auth: AuthService,
): Promise<void> {
  const body = await readJsonBody<{ email?: string; redirect_origin?: string; redirectOrigin?: string }>(req);
  const result = await auth.requestPasswordReset({
    email: body.email ?? "",
    redirectOrigin: body.redirect_origin ?? body.redirectOrigin,
  });
  sendJson(res, 200, { request_id: requestId, ...result });
}

export async function handleResetPassword(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  auth: AuthService,
): Promise<void> {
  const body = await readJsonBody<{ token?: string; new_password?: string; newPassword?: string }>(req);
  const result = await auth.consumePasswordReset({
    token: body.token ?? "",
    newPassword: body.new_password ?? body.newPassword ?? "",
  });
  sendJson(res, 200, { request_id: requestId, ...result });
}

