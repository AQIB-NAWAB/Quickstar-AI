import { bearerTokenFromHeader, verifyAccessToken, type AccessTokenVerifyResult } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import { fetchWithPolicy } from "@quickstart/utilities";

export type VerifiedAccessToken = AccessTokenVerifyResult & {
  isApiKey?: boolean;
  keyId?: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      accessToken?: VerifiedAccessToken;
      rawBearerToken?: string;
    }
  }
}

export type RequireAccessTokenOptions = {
  jwtSecret: string;
  identityUrl?: string;
  timeoutMs?: number;
};

export function createRequireAccessTokenMiddleware(
  optionsOrSecret: string | RequireAccessTokenOptions,
): RequestHandler {
  const jwtSecret = typeof optionsOrSecret === "string" ? optionsOrSecret : optionsOrSecret.jwtSecret;
  const identityUrl = typeof optionsOrSecret === "string" ? undefined : optionsOrSecret.identityUrl;
  const timeoutMs = (typeof optionsOrSecret === "string" ? undefined : optionsOrSecret.timeoutMs) ?? 5000;

  return async (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const headerApiKey = req.headers["x-api-key"];
    const rawApiKeyHeader = Array.isArray(headerApiKey) ? headerApiKey[0] : headerApiKey;
    const rawBearer = bearerTokenFromHeader(req.headers.authorization);
    const rawToken = rawApiKeyHeader || rawBearer;

    if (!rawToken) {
      return next(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required: missing or invalid Bearer token / API key",
          requestId,
        }),
      );
    }

    // Check if it's a machine API key (starts with qs_live_ or qk_live_)
    if (rawToken.startsWith("qs_live_") || rawToken.startsWith("qk_live_")) {
      if (!identityUrl) {
        return next(
          new AppError({
            code: ErrorCode.UNAUTHORIZED,
            message: "API key authentication unavailable on this gateway instance",
            requestId,
          }),
        );
      }

      try {
        const verifyRes = await fetchWithPolicy(
          `${identityUrl}/internal/v1/api-keys/verify`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-request-id": requestId,
            },
            body: JSON.stringify({ api_key: rawToken }),
          },
          { timeoutMs, maxRetries: 0 },
        );

        if (!verifyRes.ok) {
          return next(
            new AppError({
              code: ErrorCode.UNAUTHORIZED,
              message: "Invalid or revoked API key",
              requestId,
            }),
          );
        }

        const data = (await verifyRes.json()) as {
          valid?: boolean;
          orgId?: string;
          keyId?: string;
          createdBy?: string;
        };

        if (!data.valid || !data.orgId) {
          return next(
            new AppError({
              code: ErrorCode.UNAUTHORIZED,
              message: "Invalid or revoked API key",
              requestId,
            }),
          );
        }

        res.locals.accessToken = {
          sub: data.createdBy ?? data.keyId ?? "api-key-principal",
          org_id: data.orgId,
          sid: `api-key-${data.keyId ?? "session"}`,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          isApiKey: true,
          keyId: data.keyId,
        };
        res.locals.rawBearerToken = rawToken;
        return next();
      } catch {
        return next(
          new AppError({
            code: ErrorCode.UNAUTHORIZED,
            message: "Unable to verify API key",
            requestId,
          }),
        );
      }
    }

    // Otherwise, verify JWT Access Token
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
