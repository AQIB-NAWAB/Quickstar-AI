export type SecretsConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  /** 32-byte hex string — becomes the AES-256-GCM master key */
  encryptionKey: string;
  /** monotonically increasing number; increment when rotating the master key */
  encryptionKeyVersion: number;
};

export function loadSecretsConfig(): SecretsConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.SECRETS_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("SECRETS_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  const encryptionKey = process.env.ENCRYPTION_KEY ?? "";
  if (encryptionKey.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes) — run: openssl rand -hex 32",
    );
  }

  return {
    port: Number(process.env.PORT ?? process.env.SECRETS_PORT ?? 3011),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    encryptionKey,
    encryptionKeyVersion: Number(process.env.ENCRYPTION_KEY_VERSION ?? 1),
  };
}
