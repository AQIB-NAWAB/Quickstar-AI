export type RuntimeConfig = {
  port: number;
  agentServiceUrl: string;
  conversationServiceUrl: string;
  modelGatewayUrl: string;
  modelGatewayInternalToken: string;
  knowledgeServiceUrl: string;
  knowledgeInternalToken: string;
  memoryServiceUrl: string;
  memoryInternalToken: string;
  webFetchUrl: string;
  webFetchInternalToken: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  httpRequestTimeoutMs: number;
  httpRateLimitWindowMs: number;
  httpRateLimitMax: number;
};

export function loadRuntimeConfig(): RuntimeConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.RUNTIME_PORT ?? 3006),
    agentServiceUrl: (process.env.AGENT_SERVICE_URL ?? process.env.AGENT_URL ?? "http://127.0.0.1:3003").replace(/\/$/, ""),
    conversationServiceUrl: (process.env.CONVERSATION_SERVICE_URL ?? process.env.CONVERSATION_URL ?? "http://127.0.0.1:3004").replace(/\/$/, ""),
    modelGatewayUrl: (process.env.MODEL_GATEWAY_URL ?? "http://127.0.0.1:3005").replace(/\/$/, ""),
    modelGatewayInternalToken: process.env.MODEL_GATEWAY_INTERNAL_TOKEN ?? "local-dev-token-at-least-32-characters-long",
    knowledgeServiceUrl: (process.env.KNOWLEDGE_SERVICE_URL ?? process.env.KNOWLEDGE_URL ?? "http://127.0.0.1:3009").replace(/\/$/, ""),
    knowledgeInternalToken:
      process.env.KNOWLEDGE_INTERNAL_TOKEN ??
      process.env.INTERNAL_TOKEN ??
      "local-dev-token-at-least-32-characters-long",
    memoryServiceUrl: (process.env.MEMORY_SERVICE_URL ?? process.env.MEMORY_URL ?? "http://127.0.0.1:3010").replace(/\/$/, ""),
    memoryInternalToken:
      process.env.MEMORY_INTERNAL_TOKEN ??
      process.env.INTERNAL_TOKEN ??
      "local-dev-token-at-least-32-characters-long",
    webFetchUrl: (process.env.WEB_FETCH_URL ?? process.env.WEB_FETCH_SERVICE_URL ?? "http://127.0.0.1:3007").replace(/\/$/, ""),
    webFetchInternalToken:
      process.env.WEB_FETCH_INTERNAL_TOKEN ??
      process.env.WEB_ACQUISITION_INTERNAL_TOKEN ??
      "local-dev-token-at-least-32-characters-long",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    httpRateLimitWindowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
    httpRateLimitMax: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 300),
  };
}
