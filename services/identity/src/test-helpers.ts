import type { IdentityConfig } from "./config.js";
import { createIdentityService } from "./identity-service.js";
import { createNoopSessionRevocation } from "./session-revocation.js";
import { createMemoryStore } from "./store/memory-store.js";

export function testConfig(overrides: Partial<IdentityConfig> = {}): IdentityConfig {
  return {
    port: 0,
    databaseUrl: "postgresql://unused",
    redisUrl: "redis://unused",
    jwtAccessSecret: "test-secret-at-least-32-characters-long!!",
    jwtAccessTtlSeconds: 900,
    refreshTtlSeconds: 604_800,
    autoMigrate: false,
    ...overrides,
  };
}

export function createTestIdentity() {
  const store = createMemoryStore();
  const sessions = createNoopSessionRevocation();
  const config = testConfig();
  const identity = createIdentityService({ store, sessions, config });
  return { store, sessions, config, identity };
}
