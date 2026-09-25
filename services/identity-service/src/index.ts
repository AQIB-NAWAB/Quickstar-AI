import "reflect-metadata";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import type { DataSource } from "typeorm";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { loadServiceConfig } from "./config/environment.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";
import { createIdentityDataSource } from "./repository/typeorm/data-source.js";
import { createTypeOrmIdentityStore } from "./repository/typeorm/identity-typeorm-store.js";
import { createIdentityServices } from "./services/index.js";
import { createRedisSessionRevocation } from "./utils/session-revocation.js";

export async function startIdentityServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
  dataSource: DataSource;
}> {
  const config = loadServiceConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const dataSource = createIdentityDataSource(config.databaseUrl);
  await dataSource.initialize();
  const repository = createTypeOrmIdentityStore(dataSource);

  const redisClient = createRedisClient(config.redisUrl);
  try {
    await redisClient.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    throw new Error(
      `Valkey/Redis is required for identity (session revocation). Start the data plane: make up. Detail: ${message}`,
    );
  }
  const sessions = createRedisSessionRevocation(redisClient);
  logger.info("redis.connected", { url: config.redisUrl.replace(/:[^:@/]+@/, ":***@") });

  const services = createIdentityServices({ repository, sessions, config });
  const readinessProbes = [
    async () => {
      await dataSource.query("SELECT 1");
    },
    async () => {
      await redisClient.ping();
    },
  ];

  const app = createHttpServer({
    logger,
    services,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    rateLimitWindowMs: config.httpRateLimitWindowMs,
    rateLimitMax: config.httpRateLimitMax,
    authRateLimitMax: config.httpAuthRateLimitMax,
    readinessProbes,
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
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown, dataSource };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startIdentityServer();
}
