import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";

process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-secret-at-least-32-characters-long!!";
import { createLogger } from "@quickstart/logging";
import { createRedisClient } from "@quickstart/utilities";
import { loadGatewayConfig } from "../config/environment.js";
import { createGatewayServer } from "../http/create-server.js";

async function withGateway(run: (port: number) => Promise<void>): Promise<void> {
  const config = loadGatewayConfig();
  config.port = 0;
  const redis = createRedisClient(config.redisUrl);
  try {
    await redis.connect();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ECONNREFUSED") {
      throw new Error("Redis/Valkey required for gateway tests. Run: make up");
    }
    throw error;
  }
  const logger = createLogger({ service: "service-gateway-test" });
  const app = createGatewayServer({ logger, config, redis });
  const server = await new Promise<Server>((resolve) => {
    const httpServer = app.listen(0, () => resolve(httpServer));
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected bound port");
    }
    await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    if (redis.isOpen) {
      await redis.quit();
    }
  }
}

test("GET /healthz returns gateway service name", async () => {
  await withGateway(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { service: string };
    assert.equal(body.service, "service-gateway");
    assert.ok(res.headers.get("x-request-id"));
  });
});

test("GET /v1/me without token returns 401 envelope", async () => {
  await withGateway(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/me`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: { code: string; request_id: string } };
    assert.equal(body.error.code, "UNAUTHORIZED");
    assert.ok(body.error.request_id);
  });
});

test("GET /v1/me with invalid token returns 401", async () => {
  await withGateway(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/me`, {
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });
    assert.equal(res.status, 401);
  });
});
