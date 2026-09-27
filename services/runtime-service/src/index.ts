import { fileURLToPath } from "node:url";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { AgentClient } from "./clients/agent.client.js";
import { ConversationClient } from "./clients/conversation.client.js";
import { ModelGatewayClient } from "./clients/model-gateway.client.js";
import { loadRuntimeConfig } from "./config/environment.js";
import { createHttpServer, SERVICE_NAME } from "./http/create-server.js";
import { TurnsService } from "./services/turns.service.js";

export { SERVICE_NAME, createHttpServer } from "./http/create-server.js";

export async function main(): Promise<void> {
  await initTracing({ serviceName: SERVICE_NAME });
  const logger = createLogger({ service: SERVICE_NAME });
  const config = loadRuntimeConfig();

  const agentClient = new AgentClient(config.agentServiceUrl, config.httpRequestTimeoutMs);
  const conversationClient = new ConversationClient(config.conversationServiceUrl, config.httpRequestTimeoutMs);
  const modelGatewayClient = new ModelGatewayClient(
    config.modelGatewayUrl,
    config.modelGatewayInternalToken,
    config.httpRequestTimeoutMs,
  );

  const turnsService = new TurnsService(agentClient, conversationClient, modelGatewayClient);

  const app = createHttpServer({
    logger,
    turnsService,
    jwtSecret: process.env.JWT_ACCESS_SECRET,
    requestTimeoutMs: config.httpRequestTimeoutMs,
    rateLimitWindowMs: config.httpRateLimitWindowMs,
    rateLimitMax: config.httpRateLimitMax,
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const httpServer = app.listen(config.port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("runtime service listening", { port: config.port });

  const shutdown = async () => {
    logger.info("shutting down runtime service");
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    await shutdownTracing();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void main();
}

