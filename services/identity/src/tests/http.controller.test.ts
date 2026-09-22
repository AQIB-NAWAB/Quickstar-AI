import assert from "node:assert/strict";
import test from "node:test";
import { createLogger } from "@quickstart/logging";
import { createHttpServer } from "../controllers/http.controller.js";
import { createTestIdentityServices } from "../helpers/test-app.js";

async function withServer(run: (port: number) => Promise<void>): Promise<void> {
  const { services } = createTestIdentityServices();
  const server = createHttpServer({
    services,
    logger: createLogger({ service: "service-identity-test" }),
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected bound port");
  }
  try {
    await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
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
