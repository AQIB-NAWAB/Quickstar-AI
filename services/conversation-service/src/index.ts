import "reflect-metadata";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Kafka } from "kafkajs";
import type { DataSource } from "typeorm";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { loadServiceConfig } from "./config/environment.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";
import {
  createCachedWorkspaceAccessClient,
  createHttpWorkspaceAccessClient,
} from "@quickstart/workspace-access";
import { createConversationDataSource } from "./repository/typeorm/data-source.js";
import { createTypeOrmConversationStore } from "./repository/typeorm/conversation-typeorm-store.js";
import { ConversationsService } from "./services/conversations.service.js";
import { OperatorQueuesRepository } from "./repository/operator-queues.repository.js";
import { OperatorQueuesService } from "./services/operator-queues.service.js";
import { createOutboxPublisher } from "./events/outbox-publisher.js";
import { createPlatformEventConsumer } from "./events/platform-consumer.js";

export async function startConversationServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
  dataSource: DataSource;
}> {
  const config = loadServiceConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const dataSource = createConversationDataSource(config.databaseUrl);
  await dataSource.initialize();
  const store = createTypeOrmConversationStore(dataSource);
  const conversations = new ConversationsService(store);

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

  const workspaceAccess = createCachedWorkspaceAccessClient({
    redis: redisClient,
    inner: createHttpWorkspaceAccessClient(config.workspaceUrl, config.httpRequestTimeoutMs),
    ttlSec: config.membershipCacheTtlSec,
    negativeTtlSec: config.membershipCacheNegativeTtlSec,
    onCacheDegraded: (detail) => logger.warn("membership.cache_degraded", { detail }),
  });

  const readinessProbes = [
    async () => {
      await dataSource.query("SELECT 1");
    },
    async () => {
      await redisClient.ping();
    },
  ];

  const eventPool = new pg.Pool({ connectionString: config.databaseUrl });
  const operatorQueuesRepo = new OperatorQueuesRepository(eventPool);
  const operatorQueues = new OperatorQueuesService(operatorQueuesRepo);

  const app = createHttpServer({
    logger,
    conversations,
    operatorQueues,
    jwtSecret: config.jwtAccessSecret,
    internalToken: config.internalToken,
    workspaceAccess,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    rateLimitWindowMs: config.httpRateLimitWindowMs,
    rateLimitMax: config.httpRateLimitMax,
    readinessProbes,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("listening", { port: config.port, service: SERVICE_NAME });

  let outboxPublisher: ReturnType<typeof createOutboxPublisher> | null = null;
  let platformConsumer: ReturnType<typeof createPlatformEventConsumer> | null = null;

  if (config.kafkaBrokers) {
    try {
      const kafka = new Kafka({
        clientId: "conversation-service",
        brokers: config.kafkaBrokers.split(",").map((b) => b.trim()),
        retry: { retries: 2 },
      });
      outboxPublisher = createOutboxPublisher({ pool: eventPool, kafka, logger });
      await outboxPublisher.start();
      if (config.eventConsumerEnabled) {
        platformConsumer = createPlatformEventConsumer({ pool: eventPool, kafka, logger });
        await platformConsumer.start();
      }
    } catch (err) {
      logger.warn("kafka.unavailable", {
        detail: "Kafka broker unreachable; running in standalone mode without background outbox publisher",
        error: err instanceof Error ? err.message : String(err),
      });
      outboxPublisher = null;
      platformConsumer = null;
    }
  } else {
    logger.info("kafka.disabled", { detail: "KAFKA_BROKERS unset; outbox rows will not publish" });
  }

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
    if (platformConsumer) {
      await platformConsumer.stop();
    }
    if (outboxPublisher) {
      await outboxPublisher.stop();
    }
    await eventPool.end();
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown, dataSource };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startConversationServer();
}
