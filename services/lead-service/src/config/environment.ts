export type LeadConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  maxCapturedFieldKeys: number;
  maxCapturedFieldValueLength: number;
};

export function loadLeadConfig(): LeadConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.LEAD_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("LEAD_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.LEAD_PORT ?? 3014),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    maxCapturedFieldKeys: Number(process.env.LEAD_MAX_CAPTURED_FIELD_KEYS ?? 50),
    maxCapturedFieldValueLength: Number(process.env.LEAD_MAX_CAPTURED_FIELD_VALUE_LENGTH ?? 2_000),
  };
}
