import { createClient, type RedisClientType } from "redis";

export function createRedisClient(url?: string): RedisClientType {
  const redisUrl = url ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  return createClient({ url: redisUrl });
}

export async function runWithRedisLock(
  client: RedisClientType,
  lockKey: string,
  ttlSeconds: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const token = crypto.randomUUID();
  const acquired = await client.set(`lock:${lockKey}`, token, { NX: true, EX: ttlSeconds });
  if (acquired !== "OK") {
    return false;
  }
  try {
    await fn();
    return true;
  } finally {
    const current = await client.get(`lock:${lockKey}`);
    if (current === token) {
      await client.del(`lock:${lockKey}`);
    }
  }
}

export async function runWithIdempotency(
  client: RedisClientType,
  idempotencyKey: string,
  ttlSeconds: number,
  fn: () => Promise<void>,
): Promise<"executed" | "duplicate"> {
  const key = `idempotency:${idempotencyKey}`;
  const acquired = await client.set(key, "1", { NX: true, EX: ttlSeconds });
  if (acquired !== "OK") {
    return "duplicate";
  }
  await fn();
  return "executed";
}
