import type { RedisClientType } from "redis";

export type SessionRevocation = {
  revoke(sessionId: string, ttlSeconds: number): Promise<void>;
  isRevoked(sessionId: string): Promise<boolean>;
};

export function createRedisSessionRevocation(client: RedisClientType): SessionRevocation {
  return {
    async revoke(sessionId, ttlSeconds) {
      await client.set(`identity:session:revoked:${sessionId}`, "1", { EX: ttlSeconds });
    },
    async isRevoked(sessionId) {
      const value = await client.get(`identity:session:revoked:${sessionId}`);
      return value === "1";
    },
  };
}

export function createNoopSessionRevocation(): SessionRevocation {
  const revoked = new Set<string>();
  return {
    async revoke(sessionId) {
      revoked.add(sessionId);
    },
    async isRevoked(sessionId) {
      return revoked.has(sessionId);
    },
  };
}
