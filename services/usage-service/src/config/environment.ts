export type UsagePriceConfig = {
  /** Micros per 1k total tokens for fake / default model profile. */
  modelMicrosPer1kTokens: number;
  /** Micros per speech STT unit. */
  speechSttMicros: number;
  /** Micros per speech TTS unit. */
  speechTtsMicros: number;
  /** Micros per voice telephony minute. */
  voiceMinuteMicros: number;
};

export type UsageConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  prices: UsagePriceConfig;
};

export function loadUsageConfig(): UsageConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.USAGE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("USAGE_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.USAGE_PORT ?? 3017),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    prices: {
      modelMicrosPer1kTokens: Number(process.env.USAGE_MODEL_MICROS_PER_1K_TOKENS ?? 100),
      speechSttMicros: Number(process.env.USAGE_SPEECH_STT_MICROS ?? 50),
      speechTtsMicros: Number(process.env.USAGE_SPEECH_TTS_MICROS ?? 50),
      voiceMinuteMicros: Number(process.env.USAGE_VOICE_MINUTE_MICROS ?? 1000),
    },
  };
}
