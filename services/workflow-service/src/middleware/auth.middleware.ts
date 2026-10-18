import { bearerTokenFromHeader, verifyAccessToken } from "@quickstart/auth";
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
      res.locals.actorUserId = verified.sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}
