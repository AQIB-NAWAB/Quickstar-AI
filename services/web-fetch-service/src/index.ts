import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { Pool } from "pg";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { loadWebFetchConfig } from "./config/environment.js";
import { createPgJobRepository } from "./jobs/pg.repository.js";
import { startCrawlWorker } from "./jobs/worker.js";
import { createWebFetchServer, SERVICE_NAME } from "./http/create-server.js";
import { createRedisDailyUnitBudget } from "./lib/daily-budget.js";
import { createRedisInflightCap } from "./lib/inflight-cap.js";
import { createProviderRegistry } from "./providers/registry.js";
import { AcquisitionOrchestrator } from "./services/acquisition-orchestrator.js";

export async function startWebFetchServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
}> {
  const config = loadWebFetchConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const redisClient = createRedisClient(config.redisUrl);
  try {
    await redisClient.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    throw new Error(
      `Valkey/Redis connection failed. Start the data plane: make up. Detail: ${message}`,
    );
  }
  logger.info("redis.connected", { url: config.redisUrl.replace(/:[^:@/]+@/, ":***@") });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const jobs = createPgJobRepository(pool);
  const registry = createProviderRegistry(config);
  const inflight = createRedisInflightCap(redisClient, config.maxInflight);
  const budget = createRedisDailyUnitBudget(redisClient, config.dailyUnitsPerWorkspace);
  const orchestrator = new AcquisitionOrchestrator(
    config,
    registry,
    inflight,
    budget,
    jobs,
    logger,
  );

  const worker = startCrawlWorker({ config, jobs, orchestrator, logger });

  const readinessProbes = [
    async () => {
      await redisClient.ping();
    },
    async () => {
      await pool.query("SELECT 1");
    },
  ];

  const app = createWebFetchServer({
    logger,
    internalToken: config.internalToken,
    orchestrator,
    jobs,
    requestTimeoutMs: config.scrapeTimeoutMs,
    rateLimitWindowMs: config.httpRateLimitWindowMs,
    rateLimitMax: config.httpRateLimitMax,
    readinessProbes,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    worker.stop();
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
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
  void startWebFetchServer();
}
