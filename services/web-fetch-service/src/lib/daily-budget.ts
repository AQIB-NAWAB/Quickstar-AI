import { AppError, ErrorCode } from "@quickstart/errors";
import type { RedisClientType } from "redis";

export type DailyUnitBudget = {
  reserve(units: number, workspaceId: string): Promise<void>;
};

function todayKey(workspaceId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `web-fetch:units:${workspaceId}:${day}`;
}

export function createRedisDailyUnitBudget(
  redis: RedisClientType,
  maxUnitsPerWorkspacePerDay: number,
): DailyUnitBudget {
  return {
    async reserve(units: number, workspaceId: string): Promise<void> {
      if (units <= 0) return;
      const key = todayKey(workspaceId);
      const count = await redis.incrBy(key, units);
      if (count === units) {
        await redis.expire(key, 86_400 * 2);
      }
      if (count > maxUnitsPerWorkspacePerDay) {
        await redis.decrBy(key, units);
        throw new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: "Acquisition budget exceeded",
        });
      }
    },
  };
}

export function createMemoryDailyUnitBudget(maxUnitsPerWorkspacePerDay: number): DailyUnitBudget {
  const counts = new Map<string, number>();
  return {
    async reserve(units: number, workspaceId: string): Promise<void> {
      if (units <= 0) return;
      const key = todayKey(workspaceId);
      const next = (counts.get(key) ?? 0) + units;
      if (next > maxUnitsPerWorkspacePerDay) {
        throw new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: "Acquisition budget exceeded",
        });
      }
      counts.set(key, next);
    },
  };
}
