import { bearerTokenFromHeader } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import type { AuthService } from "../services/auth.service.js";

export type IdentityAuthContext = {
  userId: string;
  sessionId: string;
};

/** Require `Authorization: Bearer` and set `res.locals.identityAuth`. */
export function requireAuthMiddleware(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    try {
      const requestId = requestIdFromResponse(res);
      const token = bearerTokenFromHeader(req.headers.authorization);
      if (!token) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Missing Bearer token",
          requestId,
        });
      }
      const validated = await auth.validateAccessToken(token);
      res.locals.identityAuth = {
        userId: validated.userId,
        sessionId: validated.sessionId,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
