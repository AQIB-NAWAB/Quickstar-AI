export type GatewayConfig = {
  port: number;
  identityUrl: string;
  workspaceUrl: string;
  agentUrl: string;
  jwtAccessSecret: string;
  redisUrl: string;
  httpRequestTimeoutMs: number;
  httpRateLimitWindowMs: number;
  httpRateLimitMax: number;
};

export function loadGatewayConfig(): GatewayConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000),
    identityUrl: (process.env.IDENTITY_URL ?? "http://127.0.0.1:3001").replace(/\/$/, ""),
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    agentUrl: (process.env.AGENT_URL ?? "http://127.0.0.1:3003").replace(/\/$/, ""),
    jwtAccessSecret,
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    httpRateLimitWindowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
    httpRateLimitMax: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 300),
  };
}
