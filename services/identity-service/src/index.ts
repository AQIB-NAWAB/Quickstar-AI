import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { loadServiceConfig } from "./config/environment.js";
import { createHttpServer, SERVICE_NAME } from "./controllers/router.js";
import { createPostgresRepository } from "./repository/postgres.js";
import { createIdentityServices } from "./services/index.js";
import {
  createNoopSessionRevocation,
  createRedisSessionRevocation,
} from "./utils/session-revocation.js";

export async function startIdentityServer(options?: { useRedis?: boolean }): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
  pool: Pool;
}> {
  const config = loadServiceConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const repository = createPostgresRepository(pool);
  let sessions = createNoopSessionRevocation();
  let redisClient: ReturnType<typeof createRedisClient> | undefined;

  if (options?.useRedis !== false) {
    try {
      redisClient = createRedisClient(config.redisUrl);
      await redisClient.connect();
      sessions = createRedisSessionRevocation(redisClient);
      logger.info("redis.connected", { url: config.redisUrl.replace(/:[^:@/]+@/, ":***@") });
    } catch (error) {
      logger.warn("redis.unavailable", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const services = createIdentityServices({ repository, sessions, config });
  const app = createHttpServer({
    logger,
    services,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    rateLimitWindowMs: config.httpRateLimitWindowMs,
    rateLimitMax: config.httpRateLimitMax,
    authRateLimitMax: config.httpAuthRateLimitMax,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    if (redisClient?.isOpen) {
      await redisClient.quit();
    }
    await pool.end();
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown, pool };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startIdentityServer();
}
