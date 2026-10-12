export type GatewayConfig = {
  port: number;
  internalToken: string;
  identityUrl: string;
  workspaceUrl: string;
  agentUrl: string;
  conversationUrl: string;
  runtimeUrl: string;
  knowledgeUrl: string;
  memoryUrl: string;
  secretsUrl: string;
  leadGenerationUrl?: string;
  jwtAccessSecret: string;
  redisUrl: string;
  httpRequestTimeoutMs: number;
  httpRateLimitWindowMs: number;
  httpRateLimitMax: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
};

export function loadGatewayConfig(): GatewayConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.GATEWAY_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("GATEWAY_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000),
    internalToken,
    identityUrl: (process.env.IDENTITY_URL ?? "http://127.0.0.1:3001").replace(/\/$/, ""),
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    agentUrl: (process.env.AGENT_URL ?? "http://127.0.0.1:3003").replace(/\/$/, ""),
    conversationUrl: (process.env.CONVERSATION_URL ?? "http://127.0.0.1:3004").replace(/\/$/, ""),
    runtimeUrl: (process.env.RUNTIME_URL ?? "http://127.0.0.1:3006").replace(/\/$/, ""),
    knowledgeUrl: (
      process.env.KNOWLEDGE_URL ??
      process.env.KNOWLEDGE_SERVICE_URL ??
      "http://127.0.0.1:3009"
    ).replace(/\/$/, ""),
    memoryUrl: (
      process.env.MEMORY_URL ??
      process.env.MEMORY_SERVICE_URL ??
      "http://127.0.0.1:3010"
    ).replace(/\/$/, ""),
    secretsUrl: (
      process.env.SECRETS_URL ??
      process.env.SECRETS_SERVICE_URL ??
      "http://127.0.0.1:3011"
    ).replace(/\/$/, ""),
    leadGenerationUrl: (process.env.LEAD_GENERATION_URL ?? "http://127.0.0.1:3012").replace(
      /\/$/,
      "",
    ),
    jwtAccessSecret,
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    httpRateLimitWindowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
    httpRateLimitMax: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 300),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
  };
}
