import type { ServiceConfig } from "../config/environment.js";
import { createMemoryRepository } from "../repository/memory.repository.js";
import { createIdentityServices } from "../services/index.js";
import { createNoopSessionRevocation } from "../utils/session-revocation.js";

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

export function createTestIdentityServices() {
  const repository = createMemoryRepository();
  const sessions = createNoopSessionRevocation();
  const config = testServiceConfig();
  const services = createIdentityServices({ repository, sessions, config });
  return { repository, sessions, config, services };
}
