import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import { signAccessToken } from "@quickstart/auth";

process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-secret-at-least-32-characters-long!!";

import { createLogger } from "@quickstart/logging";
import { createRedisClient } from "@quickstart/utilities";
import type { GatewayConfig } from "../config/environment.js";
import { loadGatewayConfig } from "../config/environment.js";
import { createGatewayServer } from "../http/create-server.js";

async function withGateway(
  run: (port: number, config: GatewayConfig) => Promise<void>,
  configPatch?: Partial<GatewayConfig>,
): Promise<void> {
  const config: GatewayConfig = { ...loadGatewayConfig(), port: 0, ...configPatch };
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
    await run(address.port, config);
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

test("echoes client x-request-id on response", async () => {
  const clientRequestId = "test-request-id-7f3a2b1c";
  await withGateway(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`, {
      headers: { "x-request-id": clientRequestId },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-request-id"), clientRequestId);
  });
});

test("GET /v1/me without token returns 401 envelope", async () => {
  await withGateway(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/me`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: { code: string; request_id: string } };
    assert.equal(body.error.code, "UNAUTHORIZED");
    assert.ok(body.error.request_id);
    assert.equal(body.error.request_id, res.headers.get("x-request-id"));
  });
});

test("GET /v1/me with invalid token returns 401 envelope", async () => {
  await withGateway(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/me`, {
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: { code: string; message: string; request_id: string } };
    assert.equal(body.error.code, "UNAUTHORIZED");
    assert.match(body.error.message, /Bearer token/i);
    assert.ok(body.error.request_id);
    assert.equal(body.error.request_id, res.headers.get("x-request-id"));
  });
});

test("GET /v1/me with valid token proxies to identity (upstream unavailable when identity down)", async () => {
  await withGateway(
    async (port, config) => {
      const token = await signAccessToken(
        { sub: "user-1", org_id: "org-1", sid: "session-1" },
        { secret: config.jwtAccessSecret, ttlSeconds: 900 },
      );
      const res = await fetch(`http://127.0.0.1:${port}/v1/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error: { code: string; request_id: string } };
      assert.equal(body.error.code, "UPSTREAM_UNAVAILABLE");
      assert.equal(body.error.request_id, res.headers.get("x-request-id"));
    },
    { identityUrl: "http://127.0.0.1:9" },
  );
});

test("rate limit returns 429 RATE_LIMITED with request_id", async () => {
  await withGateway(
    async (port) => {
      const url = `http://127.0.0.1:${port}/v1/me`;
      let lastStatus = 0;
      let rateLimited: { error: { code: string; request_id: string } } | null = null;

      for (let i = 0; i < 8; i++) {
        const res = await fetch(url);
        lastStatus = res.status;
        if (res.status === 429) {
          rateLimited = (await res.json()) as { error: { code: string; request_id: string } };
          assert.equal(rateLimited.error.request_id, res.headers.get("x-request-id"));
          break;
        }
      }

      assert.ok(rateLimited, `expected 429 within 8 requests, last status ${lastStatus}`);
      assert.equal(rateLimited.error.code, "RATE_LIMITED");
    },
    { httpRateLimitMax: 3, httpRateLimitWindowMs: 60_000 },
  );
});

test("POST /v1/workspaces/:id/conversations/:id/turns proxies to runtime", async () => {
  await withGateway(
    async (port, config) => {
      const token = await signAccessToken(
        { sub: "user-1", org_id: "org-1", sid: "session-1" },
        { secret: config.jwtAccessSecret, ttlSeconds: 900 },
      );
      const res = await fetch(
        `http://127.0.0.1:${port}/v1/workspaces/00000000-0000-4000-8000-000000000001/conversations/00000000-0000-4000-8000-000000000002/turns`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ message: "Hello" }),
        },
      );
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error: { code: string; request_id: string } };
      assert.equal(body.error.code, "UPSTREAM_UNAVAILABLE");
    },
    { runtimeUrl: "http://127.0.0.1:9" },
  );
});

