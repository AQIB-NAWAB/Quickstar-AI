import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@quickstart/errors";
import type { FactsRepository, MemoryFactRow } from "../repository/facts.repository.js";
import { FactsService } from "./facts.service.js";

class FakeRepo implements Partial<FactsRepository> {
  public storedFacts: MemoryFactRow[] = [];
  public lastRequestedLimit = 0;

  async countForSubject(): Promise<number> {
    return this.storedFacts.length;
  }

  async list(
    _workspaceId: string,
    _subjectKey: string,
    limit: number,
  ): Promise<MemoryFactRow[]> {
    this.lastRequestedLimit = limit;
    return this.storedFacts.slice(0, limit);
  }

  async get(_workspaceId: string, factId: string): Promise<MemoryFactRow | null> {
    return this.storedFacts.find((f) => f.id === factId) ?? null;
  }

  async createAtomic(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string | null;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    if (input.factKey !== null) {
      const idx = this.storedFacts.findIndex(
        (f) =>
          f.workspace_id === input.workspaceId &&
          f.subject_key === input.subjectKey &&
          f.fact_key === input.factKey,
      );
      if (idx >= 0) {
        this.storedFacts[idx] = {
          ...this.storedFacts[idx],
          fact_text: input.factText,
          updated_at: new Date().toISOString(),
        };
        return this.storedFacts[idx];
      }
    }

    if (this.storedFacts.length >= 50) {
      throw new AppError({
        code: "VALIDATION_FAILED",
        message: "Maximum 50 facts per subject reached. Cannot add new fact.",
      });
    }

    const row: MemoryFactRow = {
      id: `00000000-0000-4000-8000-${String(this.storedFacts.length + 1).padStart(12, "0")}`,
      workspace_id: input.workspaceId,
      subject_key: input.subjectKey,
      fact_key: input.factKey,
      fact_text: input.factText,
      created_by_actor_id: input.createdByActorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.storedFacts.push(row);
    return row;
  }

  async update(
    _workspaceId: string,
    factId: string,
    fields: { factText?: string; factKey?: string | null },
  ): Promise<MemoryFactRow | null> {
    const idx = this.storedFacts.findIndex((f) => f.id === factId);
    if (idx < 0) return null;
    this.storedFacts[idx] = {
      ...this.storedFacts[idx],
      fact_text: fields.factText ?? this.storedFacts[idx].fact_text,
      fact_key: fields.factKey !== undefined ? fields.factKey : this.storedFacts[idx].fact_key,
      updated_at: new Date().toISOString(),
    };
    return this.storedFacts[idx];
  }

  async deleteOne(_workspaceId: string, factId: string): Promise<boolean> {
    const prev = this.storedFacts.length;
    this.storedFacts = this.storedFacts.filter((f) => f.id !== factId);
    return this.storedFacts.length < prev;
  }

  async deleteBySubject(_workspaceId: string, subjectKey: string): Promise<number> {
    const count = this.storedFacts.filter((f) => f.subject_key === subjectKey).length;
    this.storedFacts = this.storedFacts.filter((f) => f.subject_key !== subjectKey);
    return count;
  }
}

test("create rejects oversize fact_text", async () => {
  const service = new FactsService(new FakeRepo() as unknown as FactsRepository);
  await assert.rejects(
    () =>
      service.create("00000000-0000-4000-8000-0000000000a1", "actor", {
        subject_key: "anon:1",
        fact_text: "x".repeat(2049),
      }),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
});

test("create rejects whitespace-only fact_text", async () => {
  const service = new FactsService(new FakeRepo() as unknown as FactsRepository);
  await assert.rejects(
    () =>
      service.create("00000000-0000-4000-8000-0000000000a1", "actor", {
        subject_key: "anon:1",
        fact_text: "   \n\t   ",
      }),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
});

test("create rejects secret-like content in fact_text", async () => {
  const service = new FactsService(new FakeRepo() as unknown as FactsRepository);
  await assert.rejects(
    () =>
      service.create("00000000-0000-4000-8000-0000000000a1", "actor", {
        subject_key: "anon:1",
        fact_text: "User api_key is sk-abcdefghijklmnopqrstuvwxyz123456",
      }),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
});

test("create normalizes empty fact_key to null", async () => {
  const repo = new FakeRepo();
  const service = new FactsService(repo as unknown as FactsRepository);
  const fact = await service.create("00000000-0000-4000-8000-0000000000a1", "actor", {
    subject_key: "anon:1",
    fact_key: "   ",
    fact_text: "Prefers morning visits",
  });
  assert.equal(fact.fact_key, null);
});

test("public list supports fetching up to 50 facts and returns accurate total", async () => {
  const repo = new FakeRepo();
  for (let i = 0; i < 35; i++) {
    repo.storedFacts.push({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      workspace_id: "00000000-0000-4000-8000-0000000000a1",
      subject_key: "anon:1",
      fact_key: `key_${i}`,
      fact_text: `Fact text ${i}`,
      created_by_actor_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const service = new FactsService(repo as unknown as FactsRepository);
  const res = await service.list("00000000-0000-4000-8000-0000000000a1", "anon:1", 50);

  assert.equal(repo.lastRequestedLimit, 50);
  assert.equal(res.facts.length, 35);
  assert.equal(res.total, 35);
  assert.equal(res.length, 35); // array compatibility
});

test("internal list remains bounded to 20 facts even if larger limit requested", async () => {
  const repo = new FakeRepo();
  const service = new FactsService(repo as unknown as FactsRepository);
  await service.listInternal("00000000-0000-4000-8000-0000000000a1", "anon:1", 50);
  assert.equal(repo.lastRequestedLimit, 20);
});

test("list rejects malformed limit", async () => {
  const service = new FactsService(new FakeRepo() as unknown as FactsRepository);
  await assert.rejects(
    () => service.list("00000000-0000-4000-8000-0000000000a1", "anon:1", -5),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
  await assert.rejects(
    () => service.list("00000000-0000-4000-8000-0000000000a1", "anon:1", "not-a-number"),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
});

test("update supports explicit null to clear fact_key", async () => {
  const repo = new FakeRepo();
  repo.storedFacts.push({
    id: "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-0000000000a1",
    subject_key: "anon:1",
    fact_key: "old_key",
    fact_text: "Old text",
    created_by_actor_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const service = new FactsService(repo as unknown as FactsRepository);
  const updated = await service.update(
    "00000000-0000-4000-8000-0000000000a1",
    "00000000-0000-4000-8000-000000000001",
    { fact_key: null },
  );

  assert.equal(updated.fact_key, null);
  assert.equal(updated.fact_text, "Old text");
});

test("atomic capacity: allows updating existing keyed fact at capacity", async () => {
  const repo = new FakeRepo();
  for (let i = 0; i < 50; i++) {
    repo.storedFacts.push({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      workspace_id: "00000000-0000-4000-8000-0000000000a1",
      subject_key: "anon:1",
      fact_key: `key_${i}`,
      fact_text: `Original text ${i}`,
      created_by_actor_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const service = new FactsService(repo as unknown as FactsRepository);

  // Updating existing key_0 at capacity should SUCCEED
  const updated = await service.create("00000000-0000-4000-8000-0000000000a1", "actor", {
    subject_key: "anon:1",
    fact_key: "key_0",
    fact_text: "Updated text for key_0",
  });
  assert.equal(updated.fact_text, "Updated text for key_0");
  assert.equal(repo.storedFacts.length, 50);

  // Creating a new key_50 at capacity should FAIL
  await assert.rejects(
    () =>
      service.create("00000000-0000-4000-8000-0000000000a1", "actor", {
        subject_key: "anon:1",
        fact_key: "key_50",
        fact_text: "Should fail because capacity reached",
      }),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
});
