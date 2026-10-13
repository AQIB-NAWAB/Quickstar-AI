/**
 * Feature 24 LLD: idempotent create, tenant isolation, conversation_id, flexible fields.
 * Prefers DATABASE_URL Postgres; falls back to in-process PGlite when Docker is down.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { LeadsService } from "../services/leads.service.js";
import { LeadsRepository } from "./leads.repository.js";
import { runLeadMigrations } from "./migrate.js";
import { PglitePool } from "./pglite-pool.js";

type SqlPool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  end: () => Promise<void>;
};

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";

async function openPool(): Promise<SqlPool> {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 1_500 });
  try {
    await pool.query("SELECT 1");
    await runLeadMigrations(pool);
    return pool;
  } catch {
    await pool.end().catch(() => undefined);
    const local = await new PglitePool().init();
    return local;
  }
}

async function withDb(run: (service: LeadsService) => Promise<void>): Promise<void> {
  const pool = await openPool();
  try {
    const service = new LeadsService(new LeadsRepository(pool as unknown as Pool), {
      maxCapturedFieldKeys: 50,
      maxCapturedFieldValueLength: 2000,
    });
    await run(service);
  } finally {
    await pool.end();
  }
}

test("replay same idempotency_key does not duplicate", async () => {
  await withDb(async (service) => {
    const workspaceId = randomUUID();
    const key = `idem-${randomUUID()}`;
    const first = await service.upsert(workspaceId, {
      name: "Ada",
      email: "ada@example.com",
      idempotencyKey: key,
      conversationId: randomUUID(),
      capturedFields: { company: "Acme" },
    });
    assert.equal(first.created, true);
    const second = await service.upsert(workspaceId, {
      name: "Ada 2",
      idempotencyKey: key,
      capturedFields: { company: "Other" },
    });
    assert.equal(second.created, false);
    assert.equal(second.lead.id, first.lead.id);
    assert.equal(second.lead.name, "Ada");
  });
});

test("merge_on_conflict enriches captured_fields without new columns", async () => {
  await withDb(async (service) => {
    const workspaceId = randomUUID();
    const key = `merge-${randomUUID()}`;
    const first = await service.upsert(workspaceId, {
      name: "Grace",
      idempotencyKey: key,
      capturedFields: { company: "Hopper Co" },
    });
    const merged = await service.upsert(workspaceId, {
      idempotencyKey: key,
      merge_on_conflict: true,
      capturedFields: { employee_count: 42, company: "Hopper Co" },
    });
    assert.equal(merged.created, false);
    assert.equal(merged.lead.id, first.lead.id);
    assert.equal(merged.lead.capturedFields.company, "Hopper Co");
    assert.equal(merged.lead.capturedFields.employee_count, 42);
  });
});

test("cross-workspace list is empty of the other tenant", async () => {
  await withDb(async (service) => {
    const wsA = randomUUID();
    const wsB = randomUUID();
    await service.upsert(wsA, {
      name: "Only A",
      idempotencyKey: `a-${randomUUID()}`,
      email: "a@example.com",
    });
    const listB = await service.list(wsB);
    assert.equal(listB.total, 0);
    assert.equal(listB.leads.length, 0);
    const listA = await service.list(wsA);
    assert.ok(listA.total >= 1);
    assert.ok(listA.leads.every((l) => l.workspaceId === wsA));
  });
});

test("conversation_id round-trips on create/get", async () => {
  await withDb(async (service) => {
    const workspaceId = randomUUID();
    const conversationId = randomUUID();
    const { lead } = await service.upsert(workspaceId, {
      name: "Conv",
      conversationId,
      idempotencyKey: `c-${randomUUID()}`,
    });
    assert.equal(lead.conversationId, conversationId);
    const got = await service.get(workspaceId, lead.id);
    assert.equal(got.conversationId, conversationId);
  });
});

test("lead_schema put/get and denorm projection from custom roles", async () => {
  await withDb(async (service) => {
    const workspaceId = randomUUID();
    const schema = await service.putSchema(workspaceId, [
      { key: "full_name", label: "Full name", role: "identity" },
      { key: "work_email", label: "Work email", role: "contact_email" },
      { key: "company", label: "Company", role: "custom" },
    ]);
    assert.ok(schema.some((f) => f.key === "company" && f.role === "custom"));

    const { lead } = await service.upsert(workspaceId, {
      idempotencyKey: `schema-${randomUUID()}`,
      capturedFields: {
        full_name: "Schema Person",
        work_email: "schema@ex.com",
        company: "Flex Co",
      },
    });
    assert.equal(lead.name, "Schema Person");
    assert.equal(lead.email, "schema@ex.com");
    assert.equal(lead.capturedFields.company, "Flex Co");

    const loaded = await service.getSchema(workspaceId);
    assert.equal(loaded.find((f) => f.key === "company")?.label, "Company");
  });
});
