import type { Server } from "node:http";
import { signAccessToken } from "@quickstart/auth";
import { createLogger } from "@quickstart/logging";
import type { ServiceConfig } from "../config/environment.js";
import { createHttpServer, type WorkspaceServices } from "../http/create-server.js";
import { MemoryPublishableKeysStore } from "../repository/memory-publishable-keys.js";
import { publishableKeysPortFromMemory } from "../repository/publishable-keys-port.js";
import { MemoryWorkspaceStore } from "../repository/memory.js";
import { createWorkspaceServices } from "../services/index.js";

export function testServiceConfig(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
  return {
    port: 0,
    databaseUrl: "postgresql://unused",
    redisUrl: "redis://unused",
    jwtAccessSecret: "test-secret-at-least-32-characters-long!!",
    internalToken: "test-internal-token-at-least-32-chars!!",
    httpRequestTimeoutMs: 30_000,
    httpRateLimitWindowMs: 60_000,
    httpRateLimitMax: 10_000,
    kafkaBrokers: [],
    ...overrides,
  };
}

export function createTestWorkspaceServices(existingStore?: MemoryWorkspaceStore) {
  const store = existingStore ?? new MemoryWorkspaceStore();
  const publishableKeysMemory = new MemoryPublishableKeysStore();
  const config = testServiceConfig();
  const services = createWorkspaceServices(
    store,
    publishableKeysPortFromMemory(publishableKeysMemory),
  );
  return { store, config, services, publishableKeysMemory };
}

export async function createTestToken(
  userId: string,
  orgId: string = "00000000-0000-0000-0000-000000000001",
  jwtSecret: string = "test-secret-at-least-32-characters-long!!",
  email?: string,
): Promise<string> {
  return signAccessToken(
    {
      sub: userId,
      org_id: orgId,
      sid: "session-test",
      email,
    },
    {
      secret: jwtSecret,
      ttlSeconds: 3600,
    },
  );
}

export async function withWorkspaceServer(
  run: (ctx: {
    port: number;
    services: WorkspaceServices;
    store: MemoryWorkspaceStore;
    publishableKeysMemory: MemoryPublishableKeysStore;
    config: ServiceConfig;
    jwtSecret: string;
    createToken: (userId: string, orgId?: string, email?: string) => Promise<string>;
  }) => Promise<void>,
  existingStore?: MemoryWorkspaceStore,
): Promise<void> {
  const { store, config, services, publishableKeysMemory } =
    createTestWorkspaceServices(existingStore);
  const app = createHttpServer({
    services,
    jwtSecret: config.jwtAccessSecret,
    internalToken: config.internalToken,
    logger: createLogger({ service: "service-workspace-test" }),
  });

  const server = await new Promise<Server>((resolve) => {
    const httpServer = app.listen(0, () => resolve(httpServer));
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected bound port");
    }
    await run({
      port: address.port,
      services,
      store,
      publishableKeysMemory,
      config,
      jwtSecret: config.jwtAccessSecret,
      createToken: (userId: string, orgId?: string, email?: string) =>
        createTestToken(userId, orgId, config.jwtAccessSecret, email),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
  }
}
