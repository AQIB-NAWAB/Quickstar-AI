import type { MembershipSnapshot } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { RedisClientType } from "redis";
import { membershipCacheKey } from "./keys.js";
import type { WorkspaceAccessClient } from "./types.js";

export type CachedWorkspaceAccessOptions = {
  redis: RedisClientType;
  inner: WorkspaceAccessClient;
  ttlSec: number;
  negativeTtlSec: number;
  onCacheDegraded?: (detail: string) => void;
};

export function createCachedWorkspaceAccessClient(
  options: CachedWorkspaceAccessOptions,
): WorkspaceAccessClient {
  const { redis, inner, ttlSec, negativeTtlSec, onCacheDegraded } = options;

  return {
    async resolveRole(workspaceId, actorId, authorizationHeader, requestId) {
      const key = membershipCacheKey(workspaceId, actorId);

      try {
        const raw = await redis.get(key);
        if (raw) {
          const snapshot = JSON.parse(raw) as MembershipSnapshot;
          if (snapshot.deny) {
            throw new AppError({
              code: ErrorCode.FORBIDDEN,
              message: "Access denied: not a member of this workspace",
              requestId,
            });
          }
          return snapshot.role;
        }
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        onCacheDegraded?.(error instanceof Error ? error.message : "redis_read_failed");
      }

      try {
        const role = await inner.resolveRole(
          workspaceId,
          actorId,
          authorizationHeader,
          requestId,
        );
        const snapshot: MembershipSnapshot = {
          role,
          cached_at: new Date().toISOString(),
        };
        try {
          await redis.set(key, JSON.stringify(snapshot), { EX: ttlSec });
        } catch (cacheWriteError) {
          onCacheDegraded?.(
            cacheWriteError instanceof Error ? cacheWriteError.message : "redis_write_failed",
          );
        }
        return role;
      } catch (error) {
        if (
          error instanceof AppError &&
          error.code === ErrorCode.FORBIDDEN
        ) {
          const denySnapshot: MembershipSnapshot = {
            role: "analyst",
            cached_at: new Date().toISOString(),
            deny: true,
          };
          try {
            await redis.set(key, JSON.stringify(denySnapshot), { EX: negativeTtlSec });
          } catch {
            /* ignore */
          }
        }
        throw error;
      }
    },
  };
}

export async function invalidateMembershipCache(
  redis: RedisClientType,
  workspaceId: string,
  userId: string,
): Promise<void> {
  await redis.del(membershipCacheKey(workspaceId, userId));
}
