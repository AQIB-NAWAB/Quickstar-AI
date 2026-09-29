import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { FactsRepository } from "../repository/facts.repository.js";
import { runMemoryMigrations } from "../repository/migrate.js";
import { FactsService } from "../services/facts.service.js";

const runIntegration = process.env.MEMORY_INTEGRATION_TEST === "1";

test(
  "memory facts are isolated by workspace_id",
  { skip: !runIntegration },
  async () => {
    const databaseUrl =
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";
    const pool = new Pool({ connectionString: databaseUrl });
    await runMemoryMigrations(pool);
    const repo = new FactsRepository(pool);
    const facts = new FactsService(repo);

    const workspaceA = "00000000-0000-4000-8000-0000000000a1";
    const workspaceB = "00000000-0000-4000-8000-0000000000b2";
    const subject = "anon:test-subject-001";
    const actor = "00000000-0000-0000-0000-00000000000a";

    await facts.deleteBySubject(workspaceA, subject);
    await facts.deleteBySubject(workspaceB, subject);

    await facts.create(workspaceA, actor, {
      subject_key: subject,
      fact_text: "Prefers email",
    });

    const listA = await facts.list(workspaceA, subject);
    assert.equal(listA.length, 1);

    const listB = await facts.list(workspaceB, subject);
    assert.equal(listB.length, 0);

    await facts.deleteBySubject(workspaceA, subject);
    await pool.end();
  },
);
