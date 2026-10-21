import { bearerTokenFromHeader, extractAuthContext, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";

export function createAuthMiddleware(jwtSecret: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const requestId = requestIdFromResponse(res);
      const rawToken = bearerTokenFromHeader(req.headers.authorization);
      if (!rawToken) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required",
          requestId,
        });
      }
      const verified = await verifyAccessToken(rawToken, jwtSecret);
      const gatewayAuth = extractAuthContext(req.headers as Record<string, string | string[] | undefined>);
      if (gatewayAuth?.actorId && gatewayAuth.actorId !== verified.sub) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Actor context mismatch",
          requestId,
        });
      }
      res.locals.actorUserId = verified.sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}
