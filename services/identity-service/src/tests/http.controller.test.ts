import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import { createLogger } from "@quickstart/logging";
import { createHttpServer } from "../http/create-server.js";
import { createTestIdentityServices } from "../helpers/test-app.js";

async function withServer(run: (port: number) => Promise<void>): Promise<void> {
  const { services } = createTestIdentityServices();
  const app = createHttpServer({
    services,
    logger: createLogger({ service: "service-identity-test" }),
  });
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
  }
}

test("GET /healthz", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { service: string };
    assert.equal(body.service, "service-identity");
  });
});

test("POST /v1/register then GET /v1/me", async () => {
  await withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    const reg = await fetch(`${base}/v1/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "http-test@example.com",
        password: "password123",
        organization_name: "HTTP Org",
      }),
    });
    assert.equal(reg.status, 201);
    const regBody = (await reg.json()) as { tokens: { access_token: string } };
    const me = await fetch(`${base}/v1/me`, {
      headers: { authorization: `Bearer ${regBody.tokens.access_token}` },
    });
    assert.equal(me.status, 200);
    const meBody = (await me.json()) as { user: { email: string } };
    assert.equal(meBody.user.email, "http-test@example.com");
  });
});
