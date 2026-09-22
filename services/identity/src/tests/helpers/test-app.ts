import type { ServiceConfig } from "../../config/environment.js";
import { createIdentityModules } from "../../modules/index.js";
import { createInMemoryIdentityRepository } from "../../repositories/in-memory/in-memory-identity.repository.js";
import { createNoopSessionRevocation } from "../../infrastructure/redis/session-revocation.adapter.js";

export function testServiceConfig(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
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

/** In-memory stack for unit and HTTP tests. */
export function createTestIdentityModules() {
  const repository = createInMemoryIdentityRepository();
  const sessions = createNoopSessionRevocation();
  const config = testServiceConfig();
  const modules = createIdentityModules({ repository, sessions, config });
  return { repository, sessions, config, modules };
}
