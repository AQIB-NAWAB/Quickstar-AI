import type { RedisClientType } from "redis";

export type StatusIdempotencyStore = {
  /**
   * Claim a (providerCallSid, eventType) pair.
   * @returns true if this is the first claim (process the event); false if duplicate.
   */
  claim(providerCallSid: string, eventType: string): Promise<boolean>;
};

const DEFAULT_TTL_SEC = 86_400;

export function createMemoryStatusIdempotencyStore(): StatusIdempotencyStore {
  const seen = new Set<string>();
  return {
    async claim(providerCallSid, eventType) {
      const key = `${providerCallSid}:${eventType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  };
}

export function createRedisStatusIdempotencyStore(
  redis: RedisClientType,
  ttlSec = DEFAULT_TTL_SEC,
): StatusIdempotencyStore {
  return {
    async claim(providerCallSid, eventType) {
      const key = `voice:telephony:status:${providerCallSid}:${eventType}`;
      try {
        const result = await redis.set(key, "1", { NX: true, EX: ttlSec });
        return result === "OK";
      } catch {
        // Fail open on store errors would allow duplicates; fail closed would drop status.
        // Prefer processing once when Redis blips: treat as first claim.
        return true;
      }
    },
  };
}
