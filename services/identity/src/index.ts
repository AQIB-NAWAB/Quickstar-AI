import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { createIdentityApp, SERVICE_NAME } from "./app.js";
import { loadConfig } from "./config.js";
import { createIdentityService } from "./identity-service.js";
import { createNoopSessionRevocation, createRedisSessionRevocation } from "./session-revocation.js";
import { createPgStore } from "./store/pg-store.js";

export async function startIdentityServer(options?: { useRedis?: boolean }) {
  const config = loadConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const store = createPgStore(pool);
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

  const identity = createIdentityService({ store, sessions, config });
  const server = createIdentityApp({ logger, identity });

  await new Promise<void>((resolve) => {
    server.listen(config.port, "0.0.0.0", () => resolve());
  });

  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
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
