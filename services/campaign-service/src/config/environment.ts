export type CampaignConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  voiceUrl: string;
  conversationUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  dialMode: "stub" | "voice";
  dialerPollIntervalMs: number;
  dialerBatchSize: number;
  dialerWorkerId: string;
  maxTargetsPerImport: number;
  maxAttributeKeys: number;
  maxAttributeValueLength: number;
  defaultMaxConcurrentCalls: number;
  defaultMaxStartsPerMinute: number;
};

export function loadCampaignConfig(): CampaignConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.CAMPAIGN_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("CAMPAIGN_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  const dialModeRaw = (process.env.CAMPAIGN_DIAL_MODE ?? "stub").toLowerCase();
  const dialMode = dialModeRaw === "voice" ? "voice" : "stub";

  return {
    port: Number(process.env.PORT ?? process.env.CAMPAIGN_PORT ?? 3013),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    voiceUrl: (process.env.VOICE_URL ?? "http://127.0.0.1:3008").replace(/\/$/, ""),
    conversationUrl: (process.env.CONVERSATION_URL ?? "http://127.0.0.1:3004").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    dialMode,
    dialerPollIntervalMs: Number(process.env.CAMPAIGN_DIALER_POLL_MS ?? 2_000),
    dialerBatchSize: Number(process.env.CAMPAIGN_DIALER_BATCH_SIZE ?? 5),
    dialerWorkerId: process.env.CAMPAIGN_WORKER_ID ?? `campaign-worker-${process.pid}`,
    maxTargetsPerImport: Number(process.env.CAMPAIGN_MAX_TARGETS_PER_IMPORT ?? 5_000),
    maxAttributeKeys: Number(process.env.CAMPAIGN_MAX_ATTRIBUTE_KEYS ?? 50),
    maxAttributeValueLength: Number(process.env.CAMPAIGN_MAX_ATTRIBUTE_VALUE_LENGTH ?? 2_000),
    defaultMaxConcurrentCalls: Number(process.env.CAMPAIGN_DEFAULT_MAX_CONCURRENT ?? 5),
    defaultMaxStartsPerMinute: Number(process.env.CAMPAIGN_DEFAULT_MAX_STARTS_PER_MIN ?? 30),
  };
}
