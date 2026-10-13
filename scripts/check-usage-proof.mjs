/**
 * Feature 26 — Usage ledger Done when proof.
 *
 * Proves: model fact → one row; replay → still one; tenant isolation.
 *
 * Modes:
 *   1. HTTP (preferred): gateway + usage-service (+ optional model-gateway)
 *   2. Local PGlite fallback when ports are down
 *
 * Usage:
 *   node --env-file=.env scripts/check-usage-proof.mjs
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import console from "node:console";

const { fetch, AbortSignal } = globalThis;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const usageUrl = (process.env.USAGE_URL ?? "http://127.0.0.1:3017").replace(/\/$/, "");
const internalToken =
  process.env.USAGE_INTERNAL_TOKEN ??
  process.env.INTERNAL_TOKEN ??
  "dev-only-internal-token-min-32-chars-long!!!!!!";

async function request(url, { method = "GET", token, body, headers = {}, status } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60_000),
    redirect: "error",
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (status !== undefined) {
    assert.equal(
      response.status,
      status,
      `${method} ${url}: expected ${status}, got ${response.status}: ${text.slice(0, 400)}`,
    );
  }
  return { status: response.status, data };
}

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function runHttpProof() {
  await request(`${gateway}/healthz`, { status: 200 });
  await request(`${usageUrl}/healthz`, { status: 200 });
  console.log("PASS: gateway and usage-service healthz");

  const registered = await request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email: `usage-proof-${randomUUID()}@example.com`,
      password: randomBytes(24).toString("hex"),
      organization_name: `Usage proof ${randomUUID().slice(0, 8)}`,
    },
  });
  const token = registered.data.tokens.access_token;
  const orgId = registered.data.org_id;

  const wsA = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Usage A", slug: `ua-${randomUUID().slice(0, 8)}` },
  });
  const workspaceA = wsA.data.workspace.id;

  const wsB = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Usage B", slug: `ub-${randomUUID().slice(0, 8)}` },
  });
  const workspaceB = wsB.data.workspace.id;

  const requestId = randomUUID();
  const idempotencyKey = `model:${workspaceA}:${requestId}`;
  const fact = {
    workspace_id: workspaceA,
    kind: "model",
    units: 42,
    unit_label: "tokens",
    provider: "fake",
    model: "fake",
    idempotency_key: idempotencyKey,
    request_id: requestId,
    detail: { input_tokens: 30, output_tokens: 12 },
  };

  const first = await request(`${usageUrl}/internal/v1/usage/ingest`, {
    method: "POST",
    token: internalToken,
    status: 201,
    body: fact,
  });
  assert.equal(first.data.inserted, true);

  const replay = await request(`${usageUrl}/internal/v1/usage/ingest`, {
    method: "POST",
    token: internalToken,
    status: 200,
    body: fact,
  });
  assert.equal(replay.data.inserted, false);
  assert.equal(replay.data.entry.id, first.data.entry.id);

  const listA = await request(`${gateway}/v1/workspaces/${workspaceA}/usage`, {
    token,
    status: 200,
  });
  assert.ok(listA.data.count >= 1);
  assert.equal(
    listA.data.entries.filter((e) => e.idempotency_key === idempotencyKey).length,
    1,
  );

  const listB = await request(`${gateway}/v1/workspaces/${workspaceB}/usage`, {
    token,
    status: 200,
  });
  assert.equal(
    listB.data.entries.filter((e) => e.idempotency_key === idempotencyKey).length,
    0,
  );

  const result = {
    model_ledgered: true,
    idempotent_replay: true,
    tenant_isolated: true,
    ok: true,
  };
  console.log(JSON.stringify(result));
  return result;
}

async function runPgliteProof() {
  console.log("NOTE: gateway/usage-service not up — running in-process PGlite domain proof");

  const href = pathToFileURL(
    join(
      root,
      "node_modules/.pnpm/@electric-sql+pglite@0.3.16/node_modules/@electric-sql/pglite/dist/index.js",
    ),
  ).href;
  const { PGlite } = await import(href);
  const db = new PGlite();
  await db.waitReady;
  const sql = readFileSync(join(root, "services/usage-service/migrations/001_usage.sql"), "utf8").replace(
    /CREATE EXTENSION[^;]+;/gi,
    "",
  );
  await db.exec(sql);

  const { UsageRepository } = await import(
    pathToFileURL(join(root, "services/usage-service/dist/repository/usage.repository.js")).href
  );
  const { UsageService } = await import(
    pathToFileURL(join(root, "services/usage-service/dist/services/usage.service.js")).href
  );

  const pool = {
    query: (text, params) => db.query(text, params ?? []),
  };
  const service = new UsageService(new UsageRepository(pool), {
    modelMicrosPer1kTokens: 100,
    speechSttMicros: 50,
    speechTtsMicros: 50,
    voiceMinuteMicros: 1000,
  });

  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const requestId = randomUUID();
  const key = `model:${workspaceA}:${requestId}`;
  const body = {
    workspace_id: workspaceA,
    kind: "model",
    units: 42,
    unit_label: "tokens",
    provider: "fake",
    model: "fake",
    idempotency_key: key,
    request_id: requestId,
  };
  const first = await service.ingest(body);
  const second = await service.ingest(body);
  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(first.entry.id, second.entry.id);

  const listA = await service.list(workspaceA);
  const listB = await service.list(workspaceB);
  assert.equal(listA.count, 1);
  assert.equal(listB.count, 0);

  await db.close();

  const result = {
    model_ledgered: true,
    idempotent_replay: true,
    tenant_isolated: true,
    ok: true,
    mode: "pglite",
  };
  console.log(JSON.stringify(result));
  return result;
}

async function main() {
  const gwUp = await probe(`${gateway}/healthz`);
  const usageUp = await probe(`${usageUrl}/healthz`);
  if (gwUp && usageUp) {
    await runHttpProof();
  } else {
    await runPgliteProof();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
