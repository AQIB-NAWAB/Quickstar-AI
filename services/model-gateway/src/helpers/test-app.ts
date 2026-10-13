import type { Server } from "node:http";
import { createLogger } from "@quickstart/logging";
import type { ModelGatewayConfig } from "../config/environment.js";
import { JevOpenRouterClient } from "../decisions/jev-openrouter.client.js";
import { createModelGatewayServer } from "../http/create-server.js";
import { createMemoryInflightCap } from "../lib/inflight-cap.js";
import { resetFakeProviderState } from "../providers/fake.provider.js";
import { createProviderRegistry } from "../providers/registry.js";
import { CompletionOrchestrator } from "../services/completion-orchestrator.js";
import { DecisionService } from "../services/decision.service.js";

export const TEST_INTERNAL_TOKEN = "test-internal-token-at-least-32-chars!!";

export function testModelGatewayConfig(
  overrides: Partial<ModelGatewayConfig> = {},
): ModelGatewayConfig {
  return {
    port: 0,
    redisUrl: "redis://unused",
    internalToken: TEST_INTERNAL_TOKEN,
    modelMaxInflight: 500,
    completionTimeoutMs: 2_000,
    circuitFailureThreshold: 3,
    circuitCooldownMs: 60_000,
    openRouterApiKey: undefined,
    jevModel: "typesafe/jev-1.13",
    openRouterDecisionsUrl: "https://openrouter.test/decisions",
    httpRateLimitWindowMs: 60_000,
    httpRateLimitMax: 10_000,
    providerProfiles: [{ id: "fake", driver: "fake" }],
    usageUrl: "http://127.0.0.1:3017",
    usageInternalToken: TEST_INTERNAL_TOKEN,
    ...overrides,
  };
}

export async function withModelGatewayServer(
  run: (ctx: { port: number; baseUrl: string; config: ModelGatewayConfig }) => Promise<void>,
  configOverrides: Partial<ModelGatewayConfig> = {},
): Promise<void> {
  resetFakeProviderState();
  const config = testModelGatewayConfig(configOverrides);
  const logger = createLogger({ service: "service-model-gateway-test" });
  const registry = createProviderRegistry(config);
  const inflight = createMemoryInflightCap(config.modelMaxInflight);
  const orchestrator = new CompletionOrchestrator(config, registry, inflight, logger);
  const jev = config.openRouterApiKey
    ? new JevOpenRouterClient({
        apiKey: config.openRouterApiKey,
        decisionsUrl: config.openRouterDecisionsUrl,
        defaultModel: config.jevModel,
        timeoutMs: config.completionTimeoutMs,
      })
    : null;
  const decisions = new DecisionService(jev);

  const app = createModelGatewayServer({
    logger,
    internalToken: config.internalToken,
    orchestrator,
    decisions,
    requestTimeoutMs: config.completionTimeoutMs,
    rateLimitMax: config.httpRateLimitMax,
  });

  const server: Server = await new Promise((resolve) => {
    const httpServer = app.listen(0, "127.0.0.1", () => resolve(httpServer));
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run({ port, baseUrl, config });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

export function authHeaders(token: string = TEST_INTERNAL_TOKEN): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
