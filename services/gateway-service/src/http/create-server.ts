import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import type { RedisClientType } from "redis";
import type { GatewayConfig } from "../config/environment.js";
import { createRedisRateLimitMiddleware } from "../middleware/redis-rate-limit.js";
import { createRequireAccessTokenMiddleware } from "../middleware/require-access-token.js";
import { createRequirePublishableKeyMiddleware } from "../middleware/require-publishable-key.js";
import { createRequireWorkspaceMembershipMiddleware } from "../middleware/require-workspace-membership.js";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { GatewayHttpContext } from "./context.js";
import { createGatewayApiRouter } from "./routes/index.js";
import { SERVICE_NAME } from "./routes/health.routes.js";

export { SERVICE_NAME };

export type CreateGatewayServerOptions = {
  logger: Logger;
  config: GatewayConfig;
  redis: RedisClientType;
  workspaceAccess: WorkspaceAccessClient;
};

export function createGatewayServer(options: CreateGatewayServerOptions): Application {
  const { logger, config, redis, workspaceAccess } = options;

  const httpContext: GatewayHttpContext = {
    config,
    redisRateLimit: createRedisRateLimitMiddleware(redis, {
      windowMs: config.httpRateLimitWindowMs,
      max: config.httpRateLimitMax,
      skipPaths: ["/healthz", "/health"],
    }),
    requireAccessToken: createRequireAccessTokenMiddleware(config.jwtAccessSecret),
    requireWorkspaceMembership: createRequireWorkspaceMembershipMiddleware(workspaceAccess),
    requirePublishableKey: createRequirePublishableKeyMiddleware(config),
  };

  const apiRouter = createGatewayApiRouter(httpContext);

  return createPlatformApp({
    logger,
    apiRouter,
    requestTimeoutMs: config.httpRequestTimeoutMs,
  });
}
