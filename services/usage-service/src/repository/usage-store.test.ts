/**
 * Feature 26 LLD: duplicate ingest → one row; cross-workspace sum empty of the other.
 * Uses in-process PGlite (no Docker / pg native deps required).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import test from "node:test";
import type { Pool } from "pg";
import { UsageRepository } from "./usage.repository.js";
import { UsageService } from "../services/usage.service.js";

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
    join(dirname(fileURLToPath(import.meta.url)), "../../migrations/001_usage.sql"),
    "utf8",
  ).replace(/CREATE EXTENSION[^;]+;/gi, "");
  await db.exec(sql);

  return {
    query: (text, params) => db.query(text, params ?? []),
    end: async () => db.close(),
  };
}

async function withDb(run: (service: UsageService) => Promise<void>) {
  const pool = await openPglitePool();
  try {
    const repo = new UsageRepository(pool as unknown as Pool);
    const service = new UsageService(repo, {
      modelMicrosPer1kTokens: 100,
      speechSttMicros: 50,
      speechTtsMicros: 50,
      voiceMinuteMicros: 1000,
    });
    await run(service);
  } finally {
    await pool.end();
  }
}

test("duplicate ingest yields one row", async () => {
  await withDb(async (service) => {
    const workspaceId = randomUUID();
    const requestId = randomUUID();
    const key = `model:${workspaceId}:${requestId}`;
    const body = {
      workspace_id: workspaceId,
      kind: "model" as const,
      units: 150,
      unit_label: "tokens",
      provider: "fake",
      model: "fake",
      idempotency_key: key,
      request_id: requestId,
      detail: { input_tokens: 100, output_tokens: 50 },
    };
    const first = await service.ingest(body);
    const second = await service.ingest(body);
    assert.equal(first.inserted, true);
    assert.equal(second.inserted, false);
    assert.equal(first.entry.id, second.entry.id);
    const list = await service.list(workspaceId);
    assert.equal(list.count, 1);
    assert.equal(list.entries.length, 1);
  });
});

test("cross-workspace sum does not include the other tenant", async () => {
  await withDb(async (service) => {
    const workspaceA = randomUUID();
    const workspaceB = randomUUID();
    await service.ingest({
      workspace_id: workspaceA,
      kind: "model",
      units: 200,
      idempotency_key: `model:${workspaceA}:${randomUUID()}`,
      request_id: randomUUID(),
      provider: "fake",
      model: "fake",
    });
    await service.ingest({
      workspace_id: workspaceB,
      kind: "acquisition",
      units: 1,
      price_micros: 500,
      idempotency_key: `acquisition:${workspaceB}:${randomUUID()}:scrape`,
      request_id: randomUUID(),
      provider: "fake",
    });
    const listA = await service.list(workspaceA);
    const listB = await service.list(workspaceB);
    assert.equal(listA.count, 1);
    assert.equal(listB.count, 1);
    assert.ok(listA.entries.every((e) => e.workspace_id === workspaceA));
    assert.ok(listB.entries.every((e) => e.workspace_id === workspaceB));
    assert.ok(!listA.entries.some((e) => e.workspace_id === workspaceB));
  });
});
