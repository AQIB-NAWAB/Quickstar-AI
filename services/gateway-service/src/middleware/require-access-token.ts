import { bearerTokenFromHeader, verifyAccessToken, type AccessTokenVerifyResult } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";

export type VerifiedAccessToken = AccessTokenVerifyResult;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      accessToken?: VerifiedAccessToken;
      rawBearerToken?: string;
    }
  }
}

export function createRequireAccessTokenMiddleware(jwtSecret: string): RequestHandler {
  return async (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const rawToken = bearerTokenFromHeader(req.headers.authorization);
    if (!rawToken) {
      return next(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required: missing or invalid Bearer token",
          requestId,
        }),
      );
    }
    try {
      const verified = await verifyAccessToken(rawToken, jwtSecret);
      res.locals.accessToken = verified;
      res.locals.rawBearerToken = rawToken;
      return next();
    } catch {
      return next(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required: missing or invalid Bearer token",
          requestId,
        }),
      );
    }
  };
}
