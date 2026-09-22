import { createIdentityService } from "../application/identity.service.js";
import type { IdentityConfig } from "../config/env.js";
import { createMemoryIdentityStore } from "../persistence/memory/identity-store.js";
import { createNoopSessionRevocation } from "../security/session-revocation.js";

export function testConfig(overrides: Partial<IdentityConfig> = {}): IdentityConfig {
  return {
    port: 0,
    databaseUrl: "postgresql://unused",
    redisUrl: "redis://unused",
    jwtAccessSecret: "test-secret-at-least-32-characters-long!!",
    jwtAccessTtlSeconds: 900,
    refreshTtlSeconds: 604_800,
    ...overrides,
  };
}

export function createTestIdentity() {
  const store = createMemoryIdentityStore();
  const sessions = createNoopSessionRevocation();
  const config = testConfig();
  const identity = createIdentityService({ store, sessions, config });
  return { store, sessions, config, identity };
}
