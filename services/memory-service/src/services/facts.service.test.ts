import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@quickstart/errors";
import type { FactsRepository, MemoryFactRow } from "../repository/facts.repository.js";
import { FactsService } from "./facts.service.js";

class FakeRepo implements Partial<FactsRepository> {
  async countForSubject(): Promise<number> {
    return 0;
  }
  async insert(input: {
    workspaceId: string;
    subjectKey: string;
    factKey: string | null;
    factText: string;
    createdByActorId: string | null;
  }): Promise<MemoryFactRow> {
    return {
      id: "00000000-0000-4000-8000-000000000099",
      workspace_id: input.workspaceId,
      subject_key: input.subjectKey,
      fact_key: input.factKey,
      fact_text: input.factText,
      created_by_actor_id: input.createdByActorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
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
