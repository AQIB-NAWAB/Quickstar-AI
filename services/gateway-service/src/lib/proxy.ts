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

const UNTRUSTED_INGRESS_HEADERS = new Set([
  "x-quickstart-auth-context",
  "x-quickstart-internal-token",
]);

function forwardRequestHeaders(req: Request, requestId: string, access?: VerifiedAccessToken, rawBearer?: string) {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || UNTRUSTED_INGRESS_HEADERS.has(lower)) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  headers["x-request-id"] = requestId;
  if (rawBearer) {
    headers.authorization = `Bearer ${rawBearer}`;
  }
  if (access) {
    const signingSecret = process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_ACCESS_SECRET;
    const rawWorkspace = req.params?.workspaceId;
    const workspaceId = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;
    headers[AUTH_CONTEXT_HEADER] = serializeAuthContext(
      {
        tenantId: access.org_id,
        actorId: access.sub,
        roles: [],
        requestId,
        principalType: access.isApiKey ? "api_key" : "staff",
        orgId: access.org_id,
        workspaceId,
        aud: "quickstart-internal",
        email: access.email,
      },
      signingSecret,
    );
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

  let body: any = undefined;
  let duplex: string | undefined = undefined;
  const isMultipart = Boolean(headers["content-type"]?.includes("multipart/form-data"));

  if (method !== "GET" && method !== "HEAD") {
    if (isMultipart) {
      body = req;
      duplex = "half";
    } else if (req.body !== undefined && req.body !== null) {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (!headers["content-type"]) {
        headers["content-type"] = "application/json";
      }
    }
  }

  try {
    const upstream = await fetchWithPolicy(
      url,
      { method, headers, body, ...(duplex ? { duplex } : {}) } as RequestInit,
      { timeoutMs: options.timeoutMs, maxRetries: 0 },
    );

    const contentType = upstream.headers.get("content-type") ?? "";
    if (/^(audio|video|image)\//i.test(contentType) || /^(application\/(?:octet-stream|pdf|zip|x-tar))/i.test(contentType)) {
      res.status(upstream.status);
      for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition", "cache-control", "etag", "last-modified"]) {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      res.setHeader("x-request-id", requestId);
      if (!upstream.body) {
        res.end();
        return;
      }
      // Audio recordings and other binary resources must never pass through text decoding.
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
      }
      res.end();
      return;
    }
    if (contentType.includes("text/event-stream") && upstream.body) {
      res.status(upstream.status);
      res.setHeader("content-type", contentType);
      res.setHeader("cache-control", "no-cache, no-transform");
      res.setHeader("x-accel-buffering", "no");
      res.setHeader("x-request-id", requestId);
      res.flushHeaders?.();
      res.socket?.setNoDelay?.(true);
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const ok = res.write(Buffer.from(value));
        if (!ok) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
      }
      res.end();
      return;
    }

    const responseText = await upstream.text();
    res.status(upstream.status);
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) {
      res.setHeader("content-disposition", contentDisposition);
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
