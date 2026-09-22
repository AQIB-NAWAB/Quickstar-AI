import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { bearerTokenFromHeader } from "@quickstart/auth";
import type { HealthResponse } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Logger } from "@quickstart/logging";
import { getTraceIds, runWithSpan } from "@quickstart/tracing";
import type { IdentityModules } from "../../modules/index.js";
import { getRequestId, readJsonBody } from "./http-request.js";
import { sendError, sendJson, sendNoContent } from "./http-response.js";

export const SERVICE_NAME = "service-identity";

export type CreateHttpServerOptions = {
  logger: Logger;
  modules: IdentityModules;
};

async function requireAuth(req: IncomingMessage, modules: IdentityModules) {
  const token = bearerTokenFromHeader(req.headers.authorization);
  if (!token) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing Bearer token" });
  }
  return modules.auth.validateAccessToken(token);
}

export function createHttpServer(options: CreateHttpServerOptions) {
  const { logger, modules } = options;

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
          const result = await modules.auth.register({
            email: body.email ?? "",
            password: body.password ?? "",
            organizationName: body.organization_name ?? "",
          });
          sendJson(res, 201, { request_id: requestId, ...result });
          return;
        }

        if (method === "POST" && url === "/v1/login") {
          const body = await readJsonBody<{ email?: string; password?: string }>(req);
          const tokens = await modules.auth.login({
            email: body.email ?? "",
            password: body.password ?? "",
          });
          sendJson(res, 200, { request_id: requestId, ...tokens });
          return;
        }

        if (method === "POST" && url === "/v1/refresh") {
          const body = await readJsonBody<{ refresh_token?: string }>(req);
          const tokens = await modules.auth.refresh(body.refresh_token ?? "");
          sendJson(res, 200, { request_id: requestId, ...tokens });
          return;
        }

        if (method === "POST" && url === "/v1/logout") {
          const body = await readJsonBody<{ refresh_token?: string }>(req);
          const token = bearerTokenFromHeader(req.headers.authorization);
          let sessionId: string | undefined;
          if (token) {
            try {
              const auth = await modules.auth.validateAccessToken(token);
              sessionId = auth.sessionId;
            } catch {
              /* allow logout with refresh only */
            }
          }
          await modules.auth.logout({ refreshToken: body.refresh_token, sessionId });
          sendNoContent(res);
          return;
        }

        if (method === "GET" && url === "/v1/me") {
          const auth = await requireAuth(req, modules);
          const profile = await modules.users.getProfile(auth.userId);
          sendJson(res, 200, { request_id: requestId, ...profile });
          return;
        }

        if (method === "GET" && url === "/v1/organizations") {
          const auth = await requireAuth(req, modules);
          const organizations = await modules.organizations.listOrganizations(auth.userId);
          sendJson(res, 200, { request_id: requestId, organizations });
          return;
        }

        const orgMatch = url.match(/^\/v1\/organizations\/([^/]+)(\/api-keys(?:\/([^/]+))?)?$/);
        if (orgMatch) {
          const orgId = decodeURIComponent(orgMatch[1]);
          const apiKeysSuffix = orgMatch[2];

          if (method === "GET" && !apiKeysSuffix) {
            const auth = await requireAuth(req, modules);
            const org = await modules.organizations.getOrganization(orgId, auth.userId);
            sendJson(res, 200, { request_id: requestId, organization: org });
            return;
          }

          if (apiKeysSuffix === "/api-keys" && method === "POST") {
            const auth = await requireAuth(req, modules);
            const body = await readJsonBody<{ name?: string }>(req);
            const key = await modules.apiKeys.createApiKey(orgId, auth.userId, body.name ?? "");
            sendJson(res, 201, { request_id: requestId, ...key });
            return;
          }

          if (apiKeysSuffix === "/api-keys" && method === "GET") {
            const auth = await requireAuth(req, modules);
            const keys = await modules.apiKeys.listApiKeys(orgId, auth.userId);
            sendJson(res, 200, { request_id: requestId, api_keys: keys });
            return;
          }

          const deleteKeyMatch = url.match(/^\/v1\/organizations\/([^/]+)\/api-keys\/([^/]+)$/);
          if (deleteKeyMatch && method === "DELETE") {
            const auth = await requireAuth(req, modules);
            await modules.apiKeys.revokeApiKey(
              decodeURIComponent(deleteKeyMatch[1]),
              auth.userId,
              decodeURIComponent(deleteKeyMatch[2]),
            );
            sendNoContent(res);
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
