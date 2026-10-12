import { AppError, ErrorCode } from "@quickstart/errors";
import type { CallDirection } from "@quickstart/contracts";
import type { RedisClientType } from "redis";

export type CallCaps = {
  tryAcquire(workspaceId: string, direction: CallDirection): Promise<void>;
  release(workspaceId: string, direction: CallDirection): Promise<void>;
};

export type CallCapsConfig = {
  globalInbound: number;
  globalOutbound: number;
  workspaceInbound: number;
  workspaceOutbound: number;
};

function globalKey(direction: CallDirection): string {
  return `voice:cap:global:${direction}`;
}

function workspaceKey(workspaceId: string, direction: CallDirection): string {
  return `voice:cap:ws:${workspaceId}:${direction}`;
}

export function createRedisCallCaps(redis: RedisClientType, config: CallCapsConfig): CallCaps {
  return {
    async tryAcquire(workspaceId, direction) {
      try {
        const globalMax = direction === "inbound" ? config.globalInbound : config.globalOutbound;
        const wsMax = direction === "inbound" ? config.workspaceInbound : config.workspaceOutbound;
        const gKey = globalKey(direction);
        const wKey = workspaceKey(workspaceId, direction);

        const g = await redis.incr(gKey);
        if (g === 1) await redis.expire(gKey, 7200);
        if (g > globalMax) {
          await redis.decr(gKey);
          throw new AppError({
            code: ErrorCode.RATE_LIMITED,
            message: `Global ${direction} voice cap exceeded (${globalMax})`,
          });
        }

        const w = await redis.incr(wKey);
        if (w === 1) await redis.expire(wKey, 7200);
        if (w > wsMax) {
          await redis.decr(wKey);
          await redis.decr(gKey);
          throw new AppError({
            code: ErrorCode.RATE_LIMITED,
            message: `Workspace ${direction} voice cap exceeded (${wsMax})`,
          });
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "Voice concurrency store unavailable; refusing new calls",
        });
      }
    },
    async release(workspaceId, direction) {
      try {
        const g = await redis.decr(globalKey(direction));
        if (g < 0) await redis.set(globalKey(direction), "0");
        const w = await redis.decr(workspaceKey(workspaceId, direction));
        if (w < 0) await redis.set(workspaceKey(workspaceId, direction), "0");
      } catch {
        // best-effort release
      }
    },
  };
}

/** In-process caps for unit tests (single replica). */
export function createMemoryCallCaps(config: CallCapsConfig): CallCaps {
  const global = { inbound: 0, outbound: 0 };
  const byWorkspace = new Map<string, { inbound: number; outbound: number }>();

  return {
    async tryAcquire(workspaceId, direction) {
      const globalMax = direction === "inbound" ? config.globalInbound : config.globalOutbound;
      const wsMax = direction === "inbound" ? config.workspaceInbound : config.workspaceOutbound;
      if (global[direction] >= globalMax) {
        throw new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: `Global ${direction} voice cap exceeded (${globalMax})`,
        });
      }
      const ws = byWorkspace.get(workspaceId) ?? { inbound: 0, outbound: 0 };
      if (ws[direction] >= wsMax) {
        throw new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: `Workspace ${direction} voice cap exceeded (${wsMax})`,
        });
      }
      global[direction] += 1;
      ws[direction] += 1;
      byWorkspace.set(workspaceId, ws);
    },
    async release(workspaceId, direction) {
      global[direction] = Math.max(0, global[direction] - 1);
      const ws = byWorkspace.get(workspaceId);
      if (ws) {
        ws[direction] = Math.max(0, ws[direction] - 1);
      }
    },
  };
}

/** Fail-closed stub when Redis is intentionally down. */
export function createFailClosedCallCaps(): CallCaps {
  return {
    async tryAcquire() {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Voice concurrency store unavailable; refusing new calls",
      });
    },
    async release() {
      /* no-op */
    },
  };
}
