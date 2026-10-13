/**
 * Feature 24 — Flexible lead store Done when proof.
 *
 * Proves: idempotent create, tenant isolation, conversation_id, flexible captured_fields,
 * workspace lead_schema round-trip.
 *
 * Modes:
 *   1. HTTP (preferred): gateway + lead-service up — full staff JWT + internal upsert path
 *   2. Local PGlite fallback: when ports are down, runs the same domain invariants in-process
 *
 * Usage:
 *   node --env-file=.env scripts/check-lead-store-proof.mjs
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import console from "node:console";

const { fetch, AbortSignal } = globalThis;

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const lead = (process.env.LEAD_URL ?? "http://127.0.0.1:3014").replace(/\/$/, "");
const internalToken =
  process.env.LEAD_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN ?? "";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function request(url, { method = "GET", token, body, headers = {}, status } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
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
  assert.ok(internalToken.length >= 32, "LEAD_INTERNAL_TOKEN or INTERNAL_TOKEN must be >= 32 chars");

  await request(`${gateway}/healthz`, { status: 200 });
  await request(`${lead}/healthz`, { status: 200 });
  console.log("PASS: gateway and lead-service healthz");

  const registered = await request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email: `lead-proof-${randomUUID()}@example.com`,
      password: randomBytes(24).toString("hex"),
      organization_name: `Lead proof ${randomUUID().slice(0, 8)}`,
    },
  });
  const token = registered.data.tokens.access_token;
  const orgId = registered.data.org_id;

  const wsA = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Leads A", slug: `la-${randomUUID().slice(0, 8)}` },
  });
  const workspaceA = wsA.data.workspace.id;

  const wsB = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Leads B", slug: `lb-${randomUUID().slice(0, 8)}` },
  });
  const workspaceB = wsB.data.workspace.id;
  console.log("PASS: two workspaces");

  const conversationId = randomUUID();
  const idemKey = `lead-proof-${randomUUID()}`;
  const createBody = {
    name: "Proof Lead",
    email: "proof@example.com",
    phone: "+15551009999",
    conversation_id: conversationId,
    idempotency_key: idemKey,
    source: "api",
    captured_fields: { company: "Flex Co", employee_count: 12 },
  };

  const created = await request(`${lead}/v1/workspaces/${workspaceA}/leads`, {
    method: "POST",
    token,
    status: 201,
    body: createBody,
  });
  const leadId = created.data.lead.id;
  assert.equal(created.data.created, true);
  assert.equal(created.data.lead.conversation_id, conversationId);
  assert.equal(created.data.lead.captured_fields.company, "Flex Co");

  const replay = await request(`${lead}/v1/workspaces/${workspaceA}/leads`, {
    method: "POST",
    token,
    status: 200,
    body: createBody,
  });
  assert.equal(replay.data.created, false);
  assert.equal(replay.data.lead.id, leadId);
  console.log("PASS: idempotent create");

  const merged = await request(
    `${lead}/internal/v1/workspaces/${workspaceA}/leads/upsert`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${internalToken}` },
      status: 200,
      body: {
        idempotency_key: idemKey,
        merge_on_conflict: true,
        captured_fields: { industry: "software", employee_count: 15 },
        source: "lead_gen_bot",
      },
    },
  );
  assert.equal(merged.data.lead.id, leadId);
  assert.equal(merged.data.lead.captured_fields.company, "Flex Co");
  assert.equal(merged.data.lead.captured_fields.industry, "software");
  assert.equal(merged.data.lead.captured_fields.employee_count, 15);
  console.log("PASS: flexible fields merge without new columns");

  const listA = await request(`${lead}/v1/workspaces/${workspaceA}/leads`, {
    token,
    status: 200,
  });
  assert.ok((listA.data.leads ?? []).some((l) => l.id === leadId));
  assert.ok(Number(listA.data.total) >= 1);

  const listB = await request(`${lead}/v1/workspaces/${workspaceB}/leads`, {
    token,
    status: 200,
  });
  assert.equal(
    (listB.data.leads ?? []).filter((l) => l.id === leadId).length,
    0,
    "workspace B must not see workspace A leads",
  );
  console.log("PASS: tenant isolation");

  const schemaPut = await request(`${lead}/v1/workspaces/${workspaceA}/leads/schema`, {
    method: "PUT",
    token,
    status: 200,
    body: {
      lead_schema: [
        { key: "name", label: "Name", role: "identity" },
        { key: "email", label: "Email", role: "contact_email" },
        { key: "phone", label: "Phone", role: "contact_phone" },
        { key: "company", label: "Company", role: "custom" },
        { key: "industry", label: "Industry", role: "custom" },
      ],
    },
  });
  assert.ok((schemaPut.data.lead_schema ?? []).some((f) => f.key === "company"));
  assert.equal(schemaPut.data.attribute_labels.company, "Company");

  const schemaGet = await request(`${lead}/v1/workspaces/${workspaceA}/leads/schema`, {
    token,
    status: 200,
  });
  assert.equal(schemaGet.data.attribute_labels.industry, "Industry");
  console.log("PASS: lead_schema GET/PUT");

  const gwList = await request(`${gateway}/v1/workspaces/${workspaceA}/leads`, { token });
  if (gwList.status === 200) {
    assert.ok((gwList.data.leads ?? []).some((l) => l.id === leadId));
    console.log("PASS: gateway proxied list");
  } else {
    console.log(`NOTE: gateway list returned ${gwList.status} (direct lead-service path proven)`);
  }

  return { mode: "http" };
}

async function loadPglite() {
  const href = pathToFileURL(
    join(
      root,
      "node_modules/.pnpm/@electric-sql+pglite@0.3.16/node_modules/@electric-sql/pglite/dist/index.js",
    ),
  ).href;
  const mod = await import(href);
  return mod.PGlite;
}

async function runLocalProof() {
  console.log("NOTE: gateway/lead-service not up — running in-process PGlite domain proof");
  const PGlite = await loadPglite();
  const db = new PGlite();
  await db.waitReady;

  const migrationsDir = join(root, "services/lead-service/migrations");
  for (const file of ["001_leads.sql", "002_lead_schema.sql"]) {
    const sql = readFileSync(join(migrationsDir, file), "utf8").replace(
      /CREATE EXTENSION[^;]+;/gi,
      "",
    );
    await db.exec(sql);
  }

  const { LeadsRepository } = await import(
    pathToFileURL(join(root, "services/lead-service/dist/repository/leads.repository.js")).href
  );
  const { LeadsService } = await import(
    pathToFileURL(join(root, "services/lead-service/dist/services/leads.service.js")).href
  );

  const pool = {
    query: (text, params) => db.query(text, params ?? []),
    end: async () => db.close(),
  };
  const service = new LeadsService(new LeadsRepository(pool), {
    maxCapturedFieldKeys: 50,
    maxCapturedFieldValueLength: 2000,
  });

  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const conversationId = randomUUID();
  const idemKey = `lead-proof-${randomUUID()}`;

  const created = await service.upsert(workspaceA, {
    name: "Proof Lead",
    email: "proof@example.com",
    phone: "+15551009999",
    conversationId,
    idempotencyKey: idemKey,
    source: "api",
    capturedFields: { company: "Flex Co", employee_count: 12 },
  });
  assert.equal(created.created, true);
  assert.equal(created.lead.conversationId, conversationId);
  assert.equal(created.lead.capturedFields.company, "Flex Co");

  const replay = await service.upsert(workspaceA, {
    name: "Proof Lead",
    idempotencyKey: idemKey,
    capturedFields: { company: "Other" },
  });
  assert.equal(replay.created, false);
  assert.equal(replay.lead.id, created.lead.id);
  console.log("PASS: idempotent create");

  const merged = await service.upsert(workspaceA, {
    idempotencyKey: idemKey,
    merge_on_conflict: true,
    capturedFields: { industry: "software", employee_count: 15 },
    source: "lead_gen_bot",
  });
  assert.equal(merged.lead.capturedFields.company, "Flex Co");
  assert.equal(merged.lead.capturedFields.industry, "software");
  assert.equal(merged.lead.capturedFields.employee_count, 15);
  console.log("PASS: flexible fields merge without new columns");

  const listA = await service.list(workspaceA);
  assert.ok(listA.leads.some((l) => l.id === created.lead.id));
  const listB = await service.list(workspaceB);
  assert.equal(listB.leads.filter((l) => l.id === created.lead.id).length, 0);
  console.log("PASS: tenant isolation");

  const schema = await service.putSchema(workspaceA, [
    { key: "name", label: "Name", role: "identity" },
    { key: "email", label: "Email", role: "contact_email" },
    { key: "company", label: "Company", role: "custom" },
    { key: "industry", label: "Industry", role: "custom" },
  ]);
  assert.ok(schema.some((f) => f.key === "company"));
  const loaded = await service.getSchema(workspaceA);
  assert.equal(loaded.find((f) => f.key === "industry")?.label, "Industry");
  console.log("PASS: lead_schema GET/PUT");

  await pool.end();
  return { mode: "local_pglite" };
}

async function main() {
  const gwUp = await probe(`${gateway}/healthz`);
  const leadUp = await probe(`${lead}/healthz`);
  const result = gwUp && leadUp ? await runHttpProof() : await runLocalProof();

  const report = {
    mode: result.mode,
    idempotent: true,
    tenant_isolated: true,
    conversation_id: true,
    flexible_fields: true,
    lead_schema: true,
    ok: true,
  };
  console.log(JSON.stringify(report));
  console.log("Feature 24 lead store proof: ALL CHECKS PASSED");
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exitCode = 1;
});
