import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Logger } from "@quickstart/logging";
import { handleRequestError, requireAuth, withRequestTracing } from "../middleware/index.js";
import type { IdentityServices } from "../services/index.js";
import * as apiKeysController from "./api-keys.controller.js";
import * as authController from "./auth.controller.js";
import { handleHealth } from "./health.controller.js";
import * as organizationsController from "./organizations.controller.js";
import * as usersController from "./users.controller.js";

export { SERVICE_NAME } from "./health.controller.js";

export type CreateHttpServerOptions = {
  logger: Logger;
  services: IdentityServices;
};

export function createHttpServer(options: CreateHttpServerOptions) {
  const { logger, services } = options;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    await withRequestTracing(req, logger, async ({ requestId, method, url }) => {
      try {
        if (method === "GET" && (url === "/healthz" || url === "/health")) {
          handleHealth(res);
          return;
        }

        if (method === "POST" && url === "/v1/register") {
          await authController.handleRegister(req, res, requestId, services.auth);
          return;
        }
        if (method === "POST" && url === "/v1/login") {
          await authController.handleLogin(req, res, requestId, services.auth);
          return;
        }
        if (method === "POST" && url === "/v1/refresh") {
          await authController.handleRefresh(req, res, requestId, services.auth);
          return;
        }
        if (method === "POST" && url === "/v1/logout") {
          await authController.handleLogout(req, res, services.auth);
          return;
        }

        if (method === "GET" && url === "/v1/me") {
          const auth = await requireAuth(req, services.auth);
          await usersController.handleGetMe(res, requestId, auth.userId, services.users);
          return;
        }

        if (method === "GET" && url === "/v1/organizations") {
          const auth = await requireAuth(req, services.auth);
          await organizationsController.handleListOrganizations(
            res,
            requestId,
            auth.userId,
            services.organizations,
          );
          return;
        }

        const orgMatch = url.match(/^\/v1\/organizations\/([^/]+)(\/api-keys(?:\/([^/]+))?)?$/);
        if (orgMatch) {
          const orgId = decodeURIComponent(orgMatch[1]);
          const apiKeysSuffix = orgMatch[2];

          if (method === "GET" && !apiKeysSuffix) {
            const auth = await requireAuth(req, services.auth);
            await organizationsController.handleGetOrganization(
              res,
              requestId,
              orgId,
              auth.userId,
              services.organizations,
            );
            return;
          }

          if (apiKeysSuffix === "/api-keys" && method === "POST") {
            const auth = await requireAuth(req, services.auth);
            await apiKeysController.handleCreateApiKey(
              req,
              res,
              requestId,
              orgId,
              auth.userId,
              services.apiKeys,
            );
            return;
          }

          if (apiKeysSuffix === "/api-keys" && method === "GET") {
            const auth = await requireAuth(req, services.auth);
            await apiKeysController.handleListApiKeys(
              res,
              requestId,
              orgId,
              auth.userId,
              services.apiKeys,
            );
            return;
          }

          const deleteKeyMatch = url.match(/^\/v1\/organizations\/([^/]+)\/api-keys\/([^/]+)$/);
          if (deleteKeyMatch && method === "DELETE") {
            const auth = await requireAuth(req, services.auth);
            await apiKeysController.handleRevokeApiKey(
              res,
              decodeURIComponent(deleteKeyMatch[1]),
              auth.userId,
              decodeURIComponent(deleteKeyMatch[2]),
              services.apiKeys,
            );
            return;
          }
        }

        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Route not found", requestId });
      } catch (error) {
        handleRequestError(res, error, requestId, logger);
      }
    });
  }

  return createServer((req, res) => {
    void handle(req, res);
  });
}
