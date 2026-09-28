import type { Server } from "node:http";
import { createLogger } from "@quickstart/logging";
import type { WebFetchConfig } from "../config/environment.js";
import { createMemoryJobRepository } from "../jobs/memory.repository.js";
import { startCrawlWorker } from "../jobs/worker.js";
import { createWebFetchServer } from "../http/create-server.js";
import { createMemoryDailyUnitBudget } from "../lib/daily-budget.js";
import { createMemoryInflightCap } from "../lib/inflight-cap.js";
import { resetFakeAcquisitionState } from "../providers/fake.provider.js";
import { createProviderRegistry } from "../providers/registry.js";
import { AcquisitionOrchestrator } from "../services/acquisition-orchestrator.js";

export const TEST_INTERNAL_TOKEN = "test-internal-token-at-least-32-chars!!";
export const TEST_WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440000";

export function testWebFetchConfig(overrides: Partial<WebFetchConfig> = {}): WebFetchConfig {
  return {
    port: 0,
    redisUrl: "redis://unused",
    databaseUrl: "postgresql://unused",
    internalToken: TEST_INTERNAL_TOKEN,
    maxInflight: 500,
    scrapeTimeoutMs: 5_000,
    dailyUnitsPerWorkspace: 10_000,
    crawlMaxPagesCap: 10,
    crawlMaxDepthCap: 2,
    artifactMaxBytes: 1_048_576,
    searchMaxResultsCap: 5,
    circuitFailureThreshold: 3,
    circuitCooldownMs: 60_000,
    httpRateLimitWindowMs: 60_000,
    httpRateLimitMax: 10_000,
    olostepApiKey: undefined,
    olostepBaseUrl: "https://api.olostep.com",
    directHttpMaxBytes: 1_048_576,
    providerProfiles: [
      {
        id: "fake",
        driver: "fake",
        enabled: true,
        priority: 0,
        unitCostMicrosScrape: 0,
        unitCostMicrosSearch: 0,
      },
    ],
    workerPollMs: 50,
    ...overrides,
  };
}

/** @deprecated Use testWebFetchConfig */
export const testWebAcquisitionConfig = testWebFetchConfig;

export async function withWebFetchServer(
  run: (ctx: { port: number; baseUrl: string; config: WebFetchConfig }) => Promise<void>,
  configOverrides: Partial<WebFetchConfig> = {},
): Promise<void> {
  resetFakeAcquisitionState();
  const config = testWebFetchConfig(configOverrides);
  const logger = createLogger({ service: "web-fetch-test" });
  const jobs = createMemoryJobRepository();
  const registry = createProviderRegistry(config);
  const inflight = createMemoryInflightCap(config.maxInflight);
  const budget = createMemoryDailyUnitBudget(config.dailyUnitsPerWorkspace);
  const orchestrator = new AcquisitionOrchestrator(
    config,
    registry,
    inflight,
    budget,
    jobs,
    logger,
  );

  const worker = startCrawlWorker({ config, jobs, orchestrator, logger });

  const app = createWebFetchServer({
    logger,
    internalToken: config.internalToken,
    orchestrator,
    jobs,
    requestTimeoutMs: config.scrapeTimeoutMs,
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
    worker.stop();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

/** @deprecated Use withWebFetchServer */
export const withWebAcquisitionServer = withWebFetchServer;

export function authHeaders(token: string = TEST_INTERNAL_TOKEN): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
