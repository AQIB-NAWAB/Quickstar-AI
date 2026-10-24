export type ServiceConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  internalToken: string;
  httpRequestTimeoutMs: number;
  httpRateLimitWindowMs: number;
  httpRateLimitMax: number;
  kafkaBrokers: string[];
};

export function loadServiceConfig(): ServiceConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.WORKSPACE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("WORKSPACE_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.WORKSPACE_PORT ?? 3002),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    internalToken,
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    httpRateLimitWindowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
    httpRateLimitMax: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 120),
    kafkaBrokers: process.env.KAFKA_BROKERS
      ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim()).filter(Boolean)
      : [],
  };
}
