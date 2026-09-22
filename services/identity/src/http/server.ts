import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { bearerTokenFromHeader } from "@quickstart/auth";
import type { HealthResponse } from "@quickstart/contracts";
import { AppError, ErrorCode, httpStatusForError, toErrorEnvelope } from "@quickstart/errors";
import type { Logger } from "@quickstart/logging";
import { getTraceIds, runWithSpan } from "@quickstart/tracing";
import type { IdentityService } from "../application/identity.service.js";
import { getRequestId, readJsonBody } from "./request.js";

export const SERVICE_NAME = "service-identity";

export type IdentityAppOptions = {
  logger: Logger;
  identity: IdentityService;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, error: unknown, requestId: string): void {
  sendJson(res, httpStatusForError(error), toErrorEnvelope(error, requestId));
}

async function requireAuth(
  req: IncomingMessage,
  identity: IdentityService,
): Promise<{ userId: string; orgId: string; sessionId: string }> {
  const token = bearerTokenFromHeader(req.headers.authorization);
  if (!token) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing Bearer token" });
  }
  return identity.authenticateAccessToken(token);
}

export function createIdentityApp(options: IdentityAppOptions) {
  const { logger, identity } = options;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestId = getRequestId(req);
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    await runWithSpan(`${method} ${url}`, { requestId }, async () => {
      const traceIds = getTraceIds();
      logger.info("request.received", {
        request_id: requestId,
        method,
        path: url,
        trace_id: traceIds.traceId,
        span_id: traceIds.spanId,
      });

      try {
        if (method === "GET" && (url === "/healthz" || url === "/health")) {
          const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
          sendJson(res, 200, body);
          return;
        }

        if (method === "POST" && url === "/v1/register") {
          const body = await readJsonBody<{
            email?: string;
            password?: string;
            organization_name?: string;
          }>(req);
          const result = await identity.register({
            email: body.email ?? "",
            password: body.password ?? "",
            organizationName: body.organization_name ?? "",
          });
          sendJson(res, 201, { request_id: requestId, ...result });
          return;
        }

        if (method === "POST" && url === "/v1/login") {
          const body = await readJsonBody<{ email?: string; password?: string }>(req);
          const tokens = await identity.login({
            email: body.email ?? "",
            password: body.password ?? "",
          });
          sendJson(res, 200, { request_id: requestId, ...tokens });
          return;
        }

        if (method === "POST" && url === "/v1/refresh") {
          const body = await readJsonBody<{ refresh_token?: string }>(req);
          const tokens = await identity.refresh(body.refresh_token ?? "");
          sendJson(res, 200, { request_id: requestId, ...tokens });
          return;
        }

        if (method === "POST" && url === "/v1/logout") {
          const body = await readJsonBody<{ refresh_token?: string }>(req);
          const token = bearerTokenFromHeader(req.headers.authorization);
          let sessionId: string | undefined;
          if (token) {
            try {
              const auth = await identity.authenticateAccessToken(token);
              sessionId = auth.sessionId;
            } catch {
              /* allow logout with refresh only */
            }
          }
          await identity.logout({ refreshToken: body.refresh_token, sessionId });
          res.writeHead(204);
          res.end();
          return;
        }

        if (method === "GET" && url === "/v1/me") {
          const auth = await requireAuth(req, identity);
          const me = await identity.me(auth.userId);
          sendJson(res, 200, { request_id: requestId, ...me });
          return;
        }

        if (method === "GET" && url === "/v1/organizations") {
          const auth = await requireAuth(req, identity);
          const orgs = await identity.me(auth.userId);
          sendJson(res, 200, { request_id: requestId, organizations: orgs.organizations });
          return;
        }

        const orgMatch = url.match(/^\/v1\/organizations\/([^/]+)(\/api-keys(?:\/([^/]+))?)?$/);
        if (orgMatch) {
          const orgId = decodeURIComponent(orgMatch[1]);
          const apiKeysSuffix = orgMatch[2];

          if (method === "GET" && !apiKeysSuffix) {
            const auth = await requireAuth(req, identity);
            const org = await identity.getOrganization(orgId, auth.userId);
            sendJson(res, 200, { request_id: requestId, organization: org });
            return;
          }

          if (apiKeysSuffix === "/api-keys" && method === "POST") {
            const auth = await requireAuth(req, identity);
            const body = await readJsonBody<{ name?: string }>(req);
            const key = await identity.createApiKey(orgId, auth.userId, body.name ?? "");
            sendJson(res, 201, { request_id: requestId, ...key });
            return;
          }

          if (apiKeysSuffix === "/api-keys" && method === "GET") {
            const auth = await requireAuth(req, identity);
            const keys = await identity.listApiKeys(orgId, auth.userId);
            sendJson(res, 200, { request_id: requestId, api_keys: keys });
            return;
          }

          const deleteKeyMatch = url.match(/^\/v1\/organizations\/([^/]+)\/api-keys\/([^/]+)$/);
          if (deleteKeyMatch && method === "DELETE") {
            const auth = await requireAuth(req, identity);
            await identity.revokeApiKey(
              decodeURIComponent(deleteKeyMatch[1]),
              auth.userId,
              decodeURIComponent(deleteKeyMatch[2]),
            );
            res.writeHead(204);
            res.end();
            return;
          }
        }

        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Route not found", requestId });
      } catch (error) {
        logger.warn("request.failed", {
          request_id: requestId,
          error: error instanceof Error ? error.message : "unknown",
        });
        sendError(res, error, requestId);
      }
    });
  }

  return createServer((req, res) => {
    void handle(req, res);
  });
}
