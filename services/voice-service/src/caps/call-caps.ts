import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { CallDirection } from "@quickstart/contracts";
import type { RedisClientType } from "redis";

export type CapLease = {
  leaseId: string;
  workspaceId: string;
  direction: CallDirection;
};

export type CallCaps = {
  tryAcquire(workspaceId: string, direction: CallDirection): Promise<CapLease>;
  /** Idempotent: no-op if lease already released or unknown. */
  release(lease: CapLease): Promise<void>;
};

export type CallCapsConfig = {
  globalInbound: number;
  globalOutbound: number;
  workspaceInbound: number;
  workspaceOutbound: number;
  /** Counter + lease TTL in seconds (default 7200). */
  ttlSeconds?: number;
};

export type MemoryCallCaps = CallCaps & {
  occupancy(
    workspaceId: string,
    direction: CallDirection,
  ): { global: number; workspace: number };
  activeLeaseCount(): number;
};

function globalKey(direction: CallDirection): string {
  return `voice:cap:global:${direction}`;
}

function workspaceKey(workspaceId: string, direction: CallDirection): string {
  return `voice:cap:ws:${workspaceId}:${direction}`;
}

function leaseKey(leaseId: string): string {
  return `voice:cap:lease:${leaseId}`;
}

/** Atomic acquire: check both limits, INCR both, SET lease — or none. */
const ACQUIRE_LUA = `
local gKey = KEYS[1]
local wKey = KEYS[2]
local lKey = KEYS[3]
local globalMax = tonumber(ARGV[1])
local wsMax = tonumber(ARGV[2])
local leasePayload = ARGV[3]
local ttl = tonumber(ARGV[4])

local g = tonumber(redis.call('GET', gKey) or '0')
local w = tonumber(redis.call('GET', wKey) or '0')
if g >= globalMax then
  return {-1}
end
if w >= wsMax then
  return {-2}
end
g = redis.call('INCR', gKey)
w = redis.call('INCR', wKey)
redis.call('EXPIRE', gKey, ttl)
redis.call('EXPIRE', wKey, ttl)
redis.call('SET', lKey, leasePayload, 'EX', ttl)
return {1, g, w}
`;

/** Idempotent release: DEL lease then DECR only if lease existed. */
const RELEASE_LUA = `
local lKey = KEYS[1]
local gKey = KEYS[2]
local wKey = KEYS[3]
if redis.call('GET', lKey) == false then
  return 0
end
redis.call('DEL', lKey)
local g = redis.call('DECR', gKey)
if g < 0 then
  redis.call('SET', gKey, '0')
end
local w = redis.call('DECR', wKey)
if w < 0 then
  redis.call('SET', wKey, '0')
end
return 1
`;

export function createRedisCallCaps(redis: RedisClientType, config: CallCapsConfig): CallCaps {
  const ttl = config.ttlSeconds ?? 7200;
  return {
    async tryAcquire(workspaceId, direction) {
      const leaseId = randomUUID();
      const globalMax = direction === "inbound" ? config.globalInbound : config.globalOutbound;
      const wsMax = direction === "inbound" ? config.workspaceInbound : config.workspaceOutbound;
      const payload = `${workspaceId}|${direction}`;
      try {
        const result = (await redis.eval(ACQUIRE_LUA, {
          keys: [globalKey(direction), workspaceKey(workspaceId, direction), leaseKey(leaseId)],
          arguments: [String(globalMax), String(wsMax), payload, String(ttl)],
        })) as number[];

        const code = Number(result?.[0] ?? -99);
        if (code === -1) {
          throw new AppError({
            code: ErrorCode.RATE_LIMITED,
            message: `Global ${direction} voice cap exceeded (${globalMax})`,
          });
        }
        if (code === -2) {
          throw new AppError({
            code: ErrorCode.RATE_LIMITED,
            message: `Workspace ${direction} voice cap exceeded (${wsMax})`,
          });
        }
        if (code !== 1) {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: "Voice concurrency store unavailable; refusing new calls",
          });
        }
        return { leaseId, workspaceId, direction };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "Voice concurrency store unavailable; refusing new calls",
        });
      }
    },
    async release(lease) {
      try {
        await redis.eval(RELEASE_LUA, {
          keys: [
            leaseKey(lease.leaseId),
            globalKey(lease.direction),
            workspaceKey(lease.workspaceId, lease.direction),
          ],
          arguments: [],
        });
      } catch {
        // best-effort release
      }
    },
  };
}

/** In-process caps for unit tests (single replica) with ownership leases. */
export function createMemoryCallCaps(config: CallCapsConfig): MemoryCallCaps {
  const global = { inbound: 0, outbound: 0 };
  const byWorkspace = new Map<string, { inbound: number; outbound: number }>();
  const leases = new Map<string, { workspaceId: string; direction: CallDirection }>();

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
      const leaseId = randomUUID();
      leases.set(leaseId, { workspaceId, direction });
      return { leaseId, workspaceId, direction };
    },
    async release(lease) {
      if (!leases.has(lease.leaseId)) return;
      leases.delete(lease.leaseId);
      global[lease.direction] = Math.max(0, global[lease.direction] - 1);
      const ws = byWorkspace.get(lease.workspaceId);
      if (ws) {
        ws[lease.direction] = Math.max(0, ws[lease.direction] - 1);
      }
    },
    occupancy(workspaceId, direction) {
      const ws = byWorkspace.get(workspaceId) ?? { inbound: 0, outbound: 0 };
      return { global: global[direction], workspace: ws[direction] };
    },
    activeLeaseCount() {
      return leases.size;
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
