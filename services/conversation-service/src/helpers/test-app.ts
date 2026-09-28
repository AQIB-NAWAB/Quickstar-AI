import type { Server } from "node:http";
import { signAccessToken } from "@quickstart/auth";
import type { WorkspaceRole } from "@quickstart/contracts";
import { createLogger } from "@quickstart/logging";
import type { ServiceConfig } from "../config/environment.js";
import { createHttpServer } from "../http/create-server.js";
import type { WorkspaceAccessClient } from "../lib/workspace-access-client.js";
import { MemoryConversationStore } from "../repository/memory.js";
import { ConversationsService } from "../services/conversations.service.js";

export function testServiceConfig(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
  return {
    port: 0,
    databaseUrl: "postgresql://unused",
    redisUrl: "redis://unused",
    jwtAccessSecret: "test-secret-at-least-32-characters-long!!",
    workspaceUrl: "http://127.0.0.1:9",
    httpRequestTimeoutMs: 5_000,
    httpRateLimitWindowMs: 60_000,
    httpRateLimitMax: 10_000,
    membershipCacheTtlSec: 60,
    membershipCacheNegativeTtlSec: 30,
    ...overrides,
  };
}

export function createMockWorkspaceAccess(role: WorkspaceRole): WorkspaceAccessClient {
  return {
    async resolveRole() {
      return role;
    },
  };
}

export async function createTestToken(
  userId: string,
  orgId: string = "00000000-0000-0000-0000-000000000001",
  jwtSecret: string = "test-secret-at-least-32-characters-long!!",
): Promise<string> {
  return signAccessToken(
    { sub: userId, org_id: orgId, sid: "session-test" },
    { secret: jwtSecret, ttlSeconds: 3600 },
  );
}

export async function withConversationServer(
  run: (ctx: {
    port: number;
    store: MemoryConversationStore;
    jwtSecret: string;
    createToken: (userId: string, orgId?: string) => Promise<string>;
  }) => Promise<void>,
  options?: { role?: WorkspaceRole; store?: MemoryConversationStore },
): Promise<void> {
  const store = options?.store ?? new MemoryConversationStore();
  const config = testServiceConfig();
  const conversations = new ConversationsService(store);
  const workspaceAccess = createMockWorkspaceAccess(options?.role ?? "owner");

  const app = createHttpServer({
    conversations,
    jwtSecret: config.jwtAccessSecret,
    workspaceAccess,
    logger: createLogger({ service: "service-conversation-test" }),
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
      store,
      jwtSecret: config.jwtAccessSecret,
      createToken: (userId, orgId) => createTestToken(userId, orgId, config.jwtAccessSecret),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
  }
}
