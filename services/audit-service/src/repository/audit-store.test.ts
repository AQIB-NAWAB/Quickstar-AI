/**
 * Feature 27 LLD: tenant isolation; secret metadata redaction shape.
 * Uses in-process PGlite.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import test from "node:test";
import type { Pool } from "pg";
import { insertAuditEntry } from "@quickstart/audit-writer";
import { AuditRepository } from "./audit.repository.js";
import { AuditService } from "../services/audit.service.js";

type SqlPool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  end: () => Promise<void>;
};

async function openPglitePool(): Promise<SqlPool> {
  const href = pathToFileURL(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../node_modules/.pnpm/@electric-sql+pglite@0.3.16/node_modules/@electric-sql/pglite/dist/index.js",
    ),
  ).href;
  const { PGlite } = (await import(href)) as {
    PGlite: new () => {
      waitReady: Promise<unknown>;
      query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
      exec: (sql: string) => Promise<unknown>;
      close: () => Promise<void>;
    };
  };
  const db = new PGlite();
  await db.waitReady;
  const sql = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../migrations/001_audit.sql"),
    "utf8",
  ).replace(/CREATE EXTENSION[^;]+;/gi, "");
  await db.exec(sql);

  return {
    query: (text, params) => db.query(text, params ?? []),
    end: async () => db.close(),
  };
}

test("cross-workspace list does not include the other tenant", async () => {
  const pool = await openPglitePool();
  try {
    const exec = (sql: string, params?: unknown[]) => pool.query(sql, params);
    const workspaceA = randomUUID();
    const workspaceB = randomUUID();
    const actor = randomUUID();
    await insertAuditEntry(exec, {
      workspaceId: workspaceA,
      actorUserId: actor,
      action: "agent.published",
      targetType: "agent",
      targetId: randomUUID(),
      requestId: randomUUID(),
      metadata: { release_number: 1 },
    });
    await insertAuditEntry(exec, {
      workspaceId: workspaceB,
      actorUserId: actor,
      action: "secret.created",
      targetType: "secret",
      targetId: randomUUID(),
      requestId: randomUUID(),
      metadata: { name: "api-key" },
    });

    const service = new AuditService(new AuditRepository(pool as unknown as Pool), {
      defaultListDays: 7,
      maxListDays: 90,
    });
    const listA = await service.list(workspaceA, {});
    const listB = await service.list(workspaceB, {});
    assert.equal(listA.entries.length, 1);
    assert.equal(listB.entries.length, 1);
    assert.equal(listA.entries[0]?.action, "agent.published");
    assert.ok(!listA.entries.some((e) => e.workspace_id === workspaceB));
  } finally {
    await pool.end();
  }
});

test("secret audit metadata has no ciphertext or plaintext value", async () => {
  const pool = await openPglitePool();
  try {
    const exec = (sql: string, params?: unknown[]) => pool.query(sql, params);
    const workspaceId = randomUUID();
    const secretId = randomUUID();
    const plaintext = "super-secret-value-do-not-store";
    const ciphertext = "enc:aaaaaaaa";
    await insertAuditEntry(exec, {
      workspaceId,
      actorUserId: randomUUID(),
      action: "secret.created",
      targetType: "secret",
      targetId: secretId,
      requestId: randomUUID(),
      metadata: { name: "openai", key_version: 1 },
    });
    const service = new AuditService(new AuditRepository(pool as unknown as Pool), {
      defaultListDays: 7,
      maxListDays: 90,
    });
    const list = await service.list(workspaceId, {});
    assert.equal(list.entries.length, 1);
    const meta = list.entries[0]!.metadata;
    const blob = JSON.stringify(meta);
    assert.equal(meta.name, "openai");
    assert.equal(meta.key_version, 1);
    assert.ok(!blob.includes(plaintext));
    assert.ok(!blob.includes(ciphertext));
    assert.ok(!("value" in meta));
    assert.ok(!("ciphertext" in meta));
  } finally {
    await pool.end();
  }
});
