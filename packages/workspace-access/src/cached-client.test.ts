import assert from "node:assert/strict";
import test from "node:test";
import { AppError, ErrorCode } from "@quickstart/errors";
import { createRedisClient } from "@quickstart/utilities";
import { createCachedWorkspaceAccessClient, invalidateMembershipCache } from "./cached-client.js";
import type { WorkspaceAccessClient } from "./types.js";

function createCountingInner(role: "developer" | "analyst" = "developer") {
  let calls = 0;
  const client: WorkspaceAccessClient = {
    async resolveRole() {
      calls += 1;
      return role;
    },
  };
  return {
    client,
    getCalls: () => calls,
  };
}

test("cached client shares membership across two clients via Redis", async () => {
  const redis = createRedisClient(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  try {
    await redis.connect();
  } catch {
    test.skip("Redis not available");
    return;
  }

  const ws = "00000000-0000-4000-8000-0000000000a1";
  const user = "00000000-0000-4000-8000-0000000000u1";
  await invalidateMembershipCache(redis, ws, user);

  const inner = createCountingInner();
  const opts = {
    redis,
    inner: inner.client,
    ttlSec: 60,
    negativeTtlSec: 30,
  };
  const clientA = createCachedWorkspaceAccessClient(opts);
  const clientB = createCachedWorkspaceAccessClient(opts);

  const role1 = await clientA.resolveRole(ws, user, "Bearer t", "req-1");
  const role2 = await clientB.resolveRole(ws, user, "Bearer t", "req-2");

  assert.equal(role1, "developer");
  assert.equal(role2, "developer");
  assert.equal(inner.getCalls(), 1);

  await invalidateMembershipCache(redis, ws, user);
  await redis.quit();
});

test("cached client serves negative cache after forbidden", async () => {
  const redis = createRedisClient(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  try {
    await redis.connect();
  } catch {
    test.skip("Redis not available");
    return;
  }

  const ws = "00000000-0000-4000-8000-0000000000a2";
  const user = "00000000-0000-4000-8000-0000000000u2";
  await invalidateMembershipCache(redis, ws, user);

  let calls = 0;
  const inner: WorkspaceAccessClient = {
    async resolveRole() {
      calls += 1;
      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied: not a member of this workspace",
        requestId: "r",
      });
    },
  };

  const client = createCachedWorkspaceAccessClient({
    redis,
    inner,
    ttlSec: 60,
    negativeTtlSec: 30,
  });

  await assert.rejects(() => client.resolveRole(ws, user, "Bearer t", "req-1"), (err: unknown) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.code, ErrorCode.FORBIDDEN);
    return true;
  });

  await assert.rejects(() => client.resolveRole(ws, user, "Bearer t", "req-2"), (err: unknown) => {
    assert.ok(err instanceof AppError);
    return true;
  });

  assert.equal(calls, 1);
  await invalidateMembershipCache(redis, ws, user);
  await redis.quit();
});
