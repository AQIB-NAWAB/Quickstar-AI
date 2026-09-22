import type { IncomingMessage } from "node:http";
import { bearerTokenFromHeader } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AuthService } from "../services/auth.service.js";

export async function requireAuth(req: IncomingMessage, auth: AuthService) {
  const token = bearerTokenFromHeader(req.headers.authorization);
  if (!token) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing Bearer token" });
  }
  return auth.validateAccessToken(token);
}
