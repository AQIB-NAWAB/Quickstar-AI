import "reflect-metadata";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { DataSource } from "typeorm";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { loadServiceConfig } from "./config/environment.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";
import { createWorkspaceDataSource } from "./repository/typeorm/data-source.js";
import { PublishableKeysRepository } from "./repository/publishable-keys.repository.js";
import { publishableKeysPortFromPg } from "./repository/publishable-keys-port.js";
import { IntegrationsRepository } from "./repository/integrations.repository.js";
import { EmailCampaignsRepository } from "./repository/email-campaigns.repository.js";
import { NotificationsRepository } from "./repository/notifications.repository.js";
import { WebhooksRepository } from "./repository/webhooks.repository.js";
import { createTypeOrmWorkspaceStore } from "./repository/typeorm/workspace-typeorm-store.js";
import { createPlatformEventsConsumer } from "./events/platform-events-consumer.js";
import { createWebhookDeliveryWorker } from "./workers/webhook-delivery.worker.js";
import { createEmailSenderWorker } from "./workers/email-sender.worker.js";
import { createWorkspaceServices } from "./services/index.js";


export async function startWorkspaceServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
  dataSource: DataSource;
}> {
  const config = loadServiceConfig();
  const logger = createLogger({ service: SERVICE_NAME });

  await initTracing({ serviceName: SERVICE_NAME });

  const dataSource = createWorkspaceDataSource(config.databaseUrl);
  await dataSource.initialize();
  const store = createTypeOrmWorkspaceStore(dataSource);

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

  const pgPool = new pg.Pool({ connectionString: config.databaseUrl });
  const publishableKeysPort = publishableKeysPortFromPg(new PublishableKeysRepository(pgPool));
  const integrationsRepo = new IntegrationsRepository(pgPool);
  const notificationsRepo = new NotificationsRepository(pgPool);
  const webhooksRepo = new WebhooksRepository(pgPool);
  const emailCampaignsRepo = new EmailCampaignsRepository(pgPool);
  const services = createWorkspaceServices(store, publishableKeysPort, redisClient, integrationsRepo, notificationsRepo, webhooksRepo, emailCampaignsRepo);

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
    jwtSecret: config.jwtAccessSecret,
    internalToken: config.internalToken,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    rateLimitWindowMs: config.httpRateLimitWindowMs,
    rateLimitMax: config.httpRateLimitMax,
    readinessProbes,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });

  const platformEventsConsumer = createPlatformEventsConsumer({
    brokers: config.kafkaBrokers,
    groupId: "quickstart-workspace-webhooks",
    webhooksRepo,
    logger,
  });
  try {
    await platformEventsConsumer.start();
  } catch (err) {
    logger.warn("webhooks.consumer.failed_to_start", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const webhookDeliveryWorker = createWebhookDeliveryWorker({
    webhooksRepo,
    logger,
  });
  webhookDeliveryWorker.start();

  const emailSenderWorker = createEmailSenderWorker({
    repo: emailCampaignsRepo,
    service: services.emailCampaigns!,
    logger,
  });
  emailSenderWorker.start();

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await emailSenderWorker.stop();
    await webhookDeliveryWorker.stop();
    await platformEventsConsumer.stop();
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await pgPool.end();
    await shutdownTracing();
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  return { server, shutdown, dataSource };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startWorkspaceServer();
}
