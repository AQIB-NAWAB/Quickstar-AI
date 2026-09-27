import assert from "node:assert/strict";
import test from "node:test";

const RUNTIME_URL = process.env.RUNTIME_URL ?? "http://localhost:3006";
const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:3000";

const WS_ID = "00000000-0000-4000-8000-0000000000a1";
const CONV_ID = "00000000-0000-4000-8000-000000000020";

async function isServerUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(1000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

test("Feature 12 Runtime Service: health and contract reachability", async (t) => {
  const isUp = await isServerUp(RUNTIME_URL);
  if (!isUp) {
    t.skip(`Runtime service is not running on ${RUNTIME_URL}. Start it via 'pnpm --filter @quickstart/service-runtime dev'`);
    return;
  }

  // 1. Health check verification
  const healthRes = await fetch(`${RUNTIME_URL}/healthz`);
  assert.equal(healthRes.status, 200);
  const healthBody = (await healthRes.json()) as { status: string; service: string };
  assert.equal(healthBody.status, "ok");
  assert.equal(healthBody.service, "service-runtime");

  // 2. Auth requirement check - missing token must return 401
  const unauthRes = await fetch(`${RUNTIME_URL}/v1/workspaces/${WS_ID}/conversations/${CONV_ID}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Hello" }),
  });
  assert.equal(unauthRes.status, 401);
  const unauthBody = (await unauthRes.json()) as { error: { code: string; message: string } };
  assert.equal(unauthBody.error.code, "UNAUTHENTICATED");
});

test("Feature 12 Gateway Service: proxy route registration for runtime turns", async (t) => {
  const isUp = await isServerUp(GATEWAY_URL);
  if (!isUp) {
    t.skip(`Gateway service is not running on ${GATEWAY_URL}. Start it via 'pnpm --filter @quickstart/service-gateway dev'`);
    return;
  }

  // Gateway health verification
  const healthRes = await fetch(`${GATEWAY_URL}/healthz`);
  assert.equal(healthRes.status, 200);

  // Unauthenticated turn request through Gateway
  const unauthRes = await fetch(`${GATEWAY_URL}/v1/workspaces/${WS_ID}/conversations/${CONV_ID}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Hello" }),
  });
  assert.equal(unauthRes.status, 401);
});
