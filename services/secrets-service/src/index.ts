import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import {
  createCachedWorkspaceAccessClient,
  createHttpWorkspaceAccessClient,
} from "@quickstart/workspace-access";
import { createRedisClient } from "@quickstart/utilities";
import { loadSecretsConfig } from "./config/environment.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { createRequireInternalTokenMiddleware } from "./middleware/require-internal-token.js";
import { requireTenantContext } from "./middleware/tenant.middleware.js";
import { SecretsRepository } from "./repository/secrets.repository.js";
import { SecretsService } from "./services/secrets.service.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";

export async function startSecretsServer(): Promise<{ server: Server; shutdown: () => Promise<void> }> {
  const config = loadSecretsConfig();
  const logger = createLogger({ service: SERVICE_NAME });
  await initTracing({ serviceName: SERVICE_NAME });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const repo = new SecretsRepository(pool);
  const secrets = new SecretsService(repo, config.encryptionKey, config.encryptionKeyVersion);

  const redisClient = createRedisClient(config.redisUrl);
  await redisClient.connect();

  const workspaceAccess = createCachedWorkspaceAccessClient({
    redis: redisClient,
    inner: createHttpWorkspaceAccessClient(config.workspaceUrl, config.httpRequestTimeoutMs),
    ttlSec: config.membershipCacheTtlSec,
    negativeTtlSec: config.membershipCacheNegativeTtlSec,
    onCacheDegraded: (detail) => logger.warn("membership.cache_degraded", { detail }),
  });

  const app = createHttpServer({
    logger,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    readinessProbes: [
      async () => {
        await pool.query("SELECT 1");
      },
      async () => {
        await redisClient.ping();
      },
    ],
    authGuard: createAuthMiddleware(config.jwtAccessSecret),
    tenantGuard: requireTenantContext(),
    internalAuth: createRequireInternalTokenMiddleware(config.internalToken),
    workspaceAccess,
    secrets,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });
  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  const shutdown = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startSecretsServer();
}
