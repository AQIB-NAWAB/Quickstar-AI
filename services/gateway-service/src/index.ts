import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import {
  createCachedWorkspaceAccessClient,
  createHttpWorkspaceAccessClient,
} from "@quickstart/workspace-access";
import { createRedisClient } from "@quickstart/utilities";
import { loadGatewayConfig } from "./config/environment.js";
import { createGatewayServer, SERVICE_NAME } from "./http/create-server.js";

export async function startGatewayServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
}> {
  const config = loadGatewayConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const redis = createRedisClient(config.redisUrl);
  try {
    await redis.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    throw new Error(
      `Valkey/Redis is required for gateway rate limits. Start the data plane: make up. Detail: ${message}`,
    );
  }
  logger.info("redis.connected", { url: config.redisUrl.replace(/:[^:@/]+@/, ":***@") });

  const workspaceAccess = createCachedWorkspaceAccessClient({
    redis,
    inner: createHttpWorkspaceAccessClient(config.workspaceUrl, config.httpRequestTimeoutMs),
    ttlSec: config.membershipCacheTtlSec,
    negativeTtlSec: config.membershipCacheNegativeTtlSec,
    onCacheDegraded: (detail) => logger.warn("membership.cache_degraded", { detail }),
  });

  const app = createGatewayServer({ logger, config, redis, workspaceAccess });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("listening", {
    port: config.port,
    service: SERVICE_NAME,
    identityUrl: config.identityUrl,
    workspaceUrl: config.workspaceUrl,
  });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    if (redis.isOpen) {
      await redis.quit();
    }
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startGatewayServer();
}
