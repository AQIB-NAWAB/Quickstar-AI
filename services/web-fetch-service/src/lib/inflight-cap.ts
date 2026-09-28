import { AppError, ErrorCode } from "@quickstart/errors";
import type { RedisClientType } from "redis";

const REDIS_KEY = "web-fetch:inflight";

export type InflightCap = {
  acquire(): Promise<void>;
  release(): Promise<void>;
};

export function createRedisInflightCap(
  redis: RedisClientType,
  maxInflight: number,
): InflightCap {
  return {
    async acquire(): Promise<void> {
      const count = await redis.incr(REDIS_KEY);
      if (count === 1) {
        await redis.expire(REDIS_KEY, 3600);
      }
      if (count > maxInflight) {
        await redis.decr(REDIS_KEY);
        throw new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: "Web fetch global in-flight cap exceeded",
        });
      }
    },
    async release(): Promise<void> {
      const count = await redis.decr(REDIS_KEY);
      if (count < 0) {
        await redis.set(REDIS_KEY, "0");
      }
    },
  };
}

export function createMemoryInflightCap(maxInflight: number): InflightCap {
  let current = 0;
  return {
    async acquire(): Promise<void> {
      if (current >= maxInflight) {
        throw new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: "Web fetch global in-flight cap exceeded",
        });
      }
      current += 1;
    },
    async release(): Promise<void> {
      current = Math.max(0, current - 1);
    },
  };
}
