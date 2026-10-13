/**
 * Feature 23 LLD: two workers claim disjoint targets; create idempotency key.
 * Requires Postgres (DATABASE_URL). Skips cleanly when DB is unreachable.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { CampaignsRepository } from "./campaigns.repository.js";
import { runCampaignMigrations } from "./migrate.js";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";

async function withDb(
  run: (repo: CampaignsRepository, pool: Pool) => Promise<void>,
): Promise<"ran" | "skipped"> {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 2_000 });
  try {
    await pool.query("SELECT 1");
  } catch {
    await pool.end().catch(() => undefined);
    return "skipped";
  }
  try {
    await runCampaignMigrations(pool);
    const repo = new CampaignsRepository(pool);
    await run(repo, pool);
    return "ran";
  } finally {
    await pool.end();
  }
}

function baseCampaignInput(workspaceId: string, agentId: string, idempotencyKey: string | null) {
  return {
    workspaceId,
    name: `lld-${randomUUID().slice(0, 8)}`,
    description: null,
    agentId,
    agentName: "Agent",
    status: "draft" as const,
    audienceSchema: [{ key: "phone", label: "Phone", role: "dial" as const, required: true }],
    schedule: {
      startDate: "2026-01-01",
      startTime: "09:00",
      timezone: "UTC",
      dailyWindowFrom: "09:00",
      dailyWindowTo: "17:00",
    },
    pacing: { maxConcurrentCalls: 10, maxCallStartsPerMinute: 60 },
    retryPolicy: {
      maxRetries: 0,
      retryIntervalMinutes: 30,
      eligibleOutcomes: ["no_answer", "busy"],
    },
    idempotencyKey,
    scheduledStart: null,
  };
}

test("create with same idempotency key returns one campaign", async () => {
  const outcome = await withDb(async (repo) => {
    const workspaceId = randomUUID();
    const agentId = randomUUID();
    const key = `idem-${randomUUID()}`;
    const first = await repo.create(baseCampaignInput(workspaceId, agentId, key));
    const second = await repo.create(baseCampaignInput(workspaceId, agentId, key));
    assert.equal(first.id, second.id);
  });
  if (outcome === "skipped") {
    console.log("SKIP: Postgres unavailable for create idempotency test");
  }
});

test("two workers claimTargets get disjoint targets (each once)", async () => {
  const outcome = await withDb(async (repo) => {
    const workspaceId = randomUUID();
    const agentId = randomUUID();
    const campaign = await repo.create(baseCampaignInput(workspaceId, agentId, null));
    await repo.updateStatus(workspaceId, campaign.id, campaign.version, {
      status: "running",
      startedAt: new Date(),
    });

    const phones = ["+15550001", "+15550002", "+15550003", "+15550004"];
    await repo.insertTargets(
      workspaceId,
      campaign.id,
      phones.map((p) => ({
        dialAddress: p,
        dialNormalized: p,
        displayName: null,
        email: null,
        attributes: {},
        sourceKind: "api" as const,
        sourceRef: null,
      })),
    );

    const [a, b] = await Promise.all([
      repo.claimTargets("worker-a", 3),
      repo.claimTargets("worker-b", 3),
    ]);

    const ids = [...a, ...b].map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, "claimed target ids must be unique across workers");
    assert.equal(ids.length, 4, "all four targets claimed exactly once across both workers");
    assert.ok(a.every((t) => t.claimedBy === "worker-a"));
    assert.ok(b.every((t) => t.claimedBy === "worker-b"));
  });
  if (outcome === "skipped") {
    console.log("SKIP: Postgres unavailable for two-worker claim test");
  }
});

test("claimTargets respects maxConcurrentCalls pacing", async () => {
  const outcome = await withDb(async (repo) => {
    const workspaceId = randomUUID();
    const agentId = randomUUID();
    const input = baseCampaignInput(workspaceId, agentId, null);
    input.pacing = { maxConcurrentCalls: 1, maxCallStartsPerMinute: 60 };
    const campaign = await repo.create(input);
    await repo.updateStatus(workspaceId, campaign.id, campaign.version, {
      status: "running",
      startedAt: new Date(),
    });
    await repo.insertTargets(workspaceId, campaign.id, [
      {
        dialAddress: "+15551111",
        dialNormalized: "+15551111",
        displayName: null,
        email: null,
        attributes: {},
        sourceKind: "api",
        sourceRef: null,
      },
      {
        dialAddress: "+15552222",
        dialNormalized: "+15552222",
        displayName: null,
        email: null,
        attributes: {},
        sourceKind: "api",
        sourceRef: null,
      },
    ]);

    const first = await repo.claimTargets("worker-pace", 5);
    assert.equal(first.length, 1, "only one slot when maxConcurrentCalls=1");
    const second = await repo.claimTargets("worker-pace", 5);
    assert.equal(second.length, 0, "no more claims while first is still calling");
  });
  if (outcome === "skipped") {
    console.log("SKIP: Postgres unavailable for pacing test");
  }
});
