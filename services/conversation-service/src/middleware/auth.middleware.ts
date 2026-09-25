import { bearerTokenFromHeader, extractAuthContext, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";

export function createAuthMiddleware(jwtSecret: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const requestId = requestIdFromResponse(res);

      const gatewayAuth = extractAuthContext(req.headers as Record<string, string | string[] | undefined>);
      if (gatewayAuth?.actorId) {
        res.locals.actorUserId = gatewayAuth.actorId;
        return next();
      }

      const rawToken = bearerTokenFromHeader(req.headers.authorization);
      if (!rawToken) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required: Missing Bearer token or gateway auth header",
          requestId,
        });
      }

      try {
        const verified = await verifyAccessToken(rawToken, jwtSecret);
        res.locals.actorUserId = verified.sub;
        return next();
      } catch {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Invalid or expired access token",
          requestId,
        });
      }
    } catch (err) {
      next(err);
    }
  };
}
