import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import { postInternalJson } from "../lib/internal-fetch.js";
import { isOriginAllowed, requestOrigin } from "../lib/widget-origin.js";
import type { GatewayConfig } from "../config/environment.js";

export type WidgetContext = {
  workspaceId: string;
  keyId: string;
  defaultAgentId: string | null;
  allowedOrigins: string[];
};

type ResolveResponse = {
  key_id: string;
  workspace_id: string;
  default_agent_id: string | null;
  allowed_origins: string[];
  error?: { code: string; message: string };
};

export function createRequirePublishableKeyMiddleware(config: GatewayConfig): RequestHandler {
  return async (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const rawKey = req.headers["x-publishable-key"];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key?.trim()) {
      return next(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Missing X-Publishable-Key header",
          requestId,
        }),
      );
    }

    try {
      const { status, json } = await postInternalJson<ResolveResponse>(
        config.workspaceUrl,
        "/internal/publishable-keys/resolve",
        config.internalToken,
        { key: key.trim() },
        requestId,
        config.httpRequestTimeoutMs,
      );
      if (status === 401 || status === 403) {
        return next(
          new AppError({
            code: ErrorCode.UNAUTHORIZED,
            message: "Invalid publishable key",
            requestId,
          }),
        );
      }
      if (status !== 200) {
        return next(
          new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: "Failed to resolve publishable key",
            requestId,
          }),
        );
      }

      const origin = requestOrigin(
        typeof req.headers.origin === "string" ? req.headers.origin : undefined,
        typeof req.headers.referer === "string" ? req.headers.referer : undefined,
      );
      if (!isOriginAllowed(origin, json.allowed_origins ?? [])) {
        return next(
          new AppError({
            code: ErrorCode.FORBIDDEN,
            message: "Origin is not allowed for this publishable key",
            requestId,
          }),
        );
      }

      // Browser clients need this header on the actual response as well as on
      // preflight. Reflect only the origin that has passed the key allow-list.
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }

      (res.locals as { widget?: WidgetContext }).widget = {
        workspaceId: json.workspace_id,
        keyId: json.key_id,
        defaultAgentId: json.default_agent_id,
        allowedOrigins: json.allowed_origins ?? [],
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
