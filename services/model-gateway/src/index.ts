import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createRedisClient } from "@quickstart/utilities";
import { loadModelGatewayConfig } from "./config/environment.js";
import { JevOpenRouterClient } from "./decisions/jev-openrouter.client.js";
import { createModelGatewayServer, SERVICE_NAME } from "./http/create-server.js";
import { createRedisInflightCap } from "./lib/inflight-cap.js";
import { createProviderRegistry } from "./providers/registry.js";
import { CompletionOrchestrator } from "./services/completion-orchestrator.js";
import { DecisionService } from "./services/decision.service.js";

export async function startModelGatewayServer(): Promise<{
  server: Server;
  shutdown: () => Promise<void>;
}> {
  const config = loadModelGatewayConfig();
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

  const registry = createProviderRegistry(config);
  const inflight = createRedisInflightCap(redisClient, config.modelMaxInflight);
  const orchestrator = new CompletionOrchestrator(config, registry, inflight, logger);

  const jev =
    config.openRouterApiKey
      ? new JevOpenRouterClient({
          apiKey: config.openRouterApiKey,
          decisionsUrl: config.openRouterDecisionsUrl,
          defaultModel: config.jevModel,
          timeoutMs: config.completionTimeoutMs,
        })
      : null;
  const decisions = new DecisionService(jev);

  const readinessProbes = [
    async () => {
      await redisClient.ping();
    },
  ];

  const app = createModelGatewayServer({
    logger,
    internalToken: config.internalToken,
    orchestrator,
    decisions,
    requestTimeoutMs: config.completionTimeoutMs,
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
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
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
  void startModelGatewayServer();
}
