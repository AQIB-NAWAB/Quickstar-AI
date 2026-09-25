import type { Server } from "node:http";
import { signAccessToken } from "@quickstart/auth";
import { createLogger } from "@quickstart/logging";
import type { ServiceConfig } from "../config/environment.js";
import { createHttpServer, type WorkspaceServices } from "../http/create-server.js";
import { MemoryWorkspaceStore } from "../repository/memory.js";
import { createWorkspaceServices } from "../services/index.js";

export function testServiceConfig(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
  return {
    port: 0,
    databaseUrl: "postgresql://unused",
    redisUrl: "redis://unused",
    jwtAccessSecret: "test-secret-at-least-32-characters-long!!",
    httpRequestTimeoutMs: 30_000,
    httpRateLimitWindowMs: 60_000,
    httpRateLimitMax: 10_000,
    ...overrides,
  };
}

export function createTestWorkspaceServices(existingStore?: MemoryWorkspaceStore) {
  const store = existingStore ?? new MemoryWorkspaceStore();
  const config = testServiceConfig();
  const services = createWorkspaceServices(store);
  return { store, config, services };
}

export async function createTestToken(
  userId: string,
  orgId: string = "00000000-0000-0000-0000-000000000001",
  jwtSecret: string = "test-secret-at-least-32-characters-long!!",
): Promise<string> {
  return signAccessToken(
    {
      sub: userId,
      org_id: orgId,
      sid: "session-test",
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
    jwtSecret: string;
    createToken: (userId: string, orgId?: string) => Promise<string>;
  }) => Promise<void>,
  existingStore?: MemoryWorkspaceStore,
): Promise<void> {
  const { store, config, services } = createTestWorkspaceServices(existingStore);
  const app = createHttpServer({
    services,
    jwtSecret: config.jwtAccessSecret,
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
      jwtSecret: config.jwtAccessSecret,
      createToken: (userId: string, orgId?: string) =>
        createTestToken(userId, orgId, config.jwtAccessSecret),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
  }
}
