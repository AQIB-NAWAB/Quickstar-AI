import { AUTH_CONTEXT_HEADER, serializeAuthContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type Request, type Response } from "@quickstart/http-server";
import { fetchWithPolicy } from "@quickstart/utilities";
import type { VerifiedAccessToken } from "../middleware/require-access-token.js";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function forwardRequestHeaders(req: Request, requestId: string, access?: VerifiedAccessToken, rawBearer?: string) {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  headers["x-request-id"] = requestId;
  if (rawBearer) {
    headers.authorization = `Bearer ${rawBearer}`;
  }
  if (access) {
    headers[AUTH_CONTEXT_HEADER] = serializeAuthContext({
      tenantId: access.org_id,
      actorId: access.sub,
      roles: [],
      requestId,
    });
  }
  return headers;
}

export async function proxyToUpstream(
  req: Request,
  res: Response,
  upstreamBase: string,
  options: { timeoutMs: number; access?: VerifiedAccessToken; rawBearer?: string },
): Promise<void> {
  const requestId = requestIdFromResponse(res);
  const path = req.originalUrl.split("?")[0];
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  const url = `${upstreamBase}${path}${query}`;
  const method = req.method;
  const headers = forwardRequestHeaders(req, requestId, options.access, options.rawBearer);

  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD" && req.body !== undefined && req.body !== null) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
  }

  try {
    const upstream = await fetchWithPolicy(
      url,
      { method, headers, body },
      { timeoutMs: options.timeoutMs, maxRetries: 0 },
    );

    const responseText = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    res.setHeader("x-request-id", requestId);
    res.send(responseText);
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    throw new AppError({
      code: isAbort ? ErrorCode.UPSTREAM_TIMEOUT : ErrorCode.UPSTREAM_UNAVAILABLE,
      message: isAbort ? "Upstream request timed out" : "Upstream service unavailable",
      requestId,
    });
  }
}
