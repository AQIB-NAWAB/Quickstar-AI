import { AUTH_CONTEXT_HEADER, bearerTokenFromHeader, extractAuthContext, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";

export function createAuthMiddleware(jwtSecret: string, internalSecret?: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const requestId = requestIdFromResponse(res);
      const secretToVerify = internalSecret || process.env.INTERNAL_SERVICE_SECRET || jwtSecret;
      const secrets = [secretToVerify, process.env.INTERNAL_SERVICE_SECRET_PREVIOUS].filter(Boolean) as string[];

      const rawAuthHeader = req.headers[AUTH_CONTEXT_HEADER] ?? req.headers[AUTH_CONTEXT_HEADER.toLowerCase()];
      const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;

      if (authHeader) {
        const gatewayAuth = extractAuthContext(
          req.headers as Record<string, string | string[] | undefined>,
          secrets,
        );
        if (!gatewayAuth || !gatewayAuth.actorId) {
          throw new AppError({
            code: ErrorCode.UNAUTHORIZED,
            message: "Invalid or forged service authentication context",
            requestId,
          });
        }

        const rawWorkspace = req.params?.workspaceId;
        const workspaceId = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;
        if (workspaceId && gatewayAuth.workspaceId && gatewayAuth.workspaceId !== workspaceId) {
          throw new AppError({
            code: ErrorCode.FORBIDDEN,
            message: "Cross-workspace access rejected: context workspace does not match target route",
            requestId,
          });
        }

        res.locals.actorUserId = gatewayAuth.actorId;
        res.locals.authContext = gatewayAuth;
        return next();
      }

      const rawToken = bearerTokenFromHeader(req.headers.authorization);
      if (!rawToken) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required: Missing Bearer token or service auth header",
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
