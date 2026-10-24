import assert from "node:assert/strict";
import test from "node:test";
import { EvalService } from "./eval.service.js";
import type { EvalRepository } from "../repository/eval.repository.js";
import type { EvalRun } from "../domain/types.js";

const WORKSPACE_ID = "a0000000-0000-4000-a000-000000000001";
const AGENT_ID = "b0000000-0000-4000-a000-000000000001";
const DATASET_ID = "c0000000-0000-4000-a000-000000000001";

function createMockRepo(overrides: Record<string, unknown> = {}): EvalRepository {
  const audits: any[] = [];
  const defaultRepo = {
    listRunCaseSnapshots: async (_runId: string) => [
      {
        runId: "run-1",
        caseId: "case-1",
        workspaceId: WORKSPACE_ID,
        caseName: "Semantic case 1",
        input: "Hello",
        expectedOutput: "Hi there, how can I help you?",
        expectedTools: [],
        fixtureResponses: [],
      },
    ],
    insertCaseResult: async (_input: any) => {},
    updateRunProgress: async () => {},
    renewLease: async () => {},
    completeRun: async (_runId: string, _fence: string, patch: any) => ({
      id: "run-1",
      workspaceId: WORKSPACE_ID,
      agentId: AGENT_ID,
      agentVersionId: "v-1",
      status: patch.status,
      score: patch.score,
      passedCount: patch.passedCount,
      failedCount: patch.failedCount,
      erroredCount: patch.erroredCount,
      unavailableCount: patch.unavailableCount ?? 0,
      unavailableReason: patch.unavailableReason ?? null,
      averageLatencyMs: patch.averageLatencyMs ?? null,
    }),
    listRuns: async () => ({ runs: [], total: 0 }),
    getRun: async () => null,
    listResults: async () => [],
    recordGateAudit: async (audit: any) => {
      audits.push(audit);
    },
    _getAudits: () => audits,
  };
  return { ...defaultRepo, ...overrides } as unknown as EvalRepository;
}

test("EvalService: in production, embedding provider failure returns null without fake vectors", async () => {
  // Production configuration (not fake provider, but invalid/unreachable API key)
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const repo = createMockRepo();
    const service = new EvalService(repo, null, {
      maxCasesPerRun: 50,
      maxRunsPerWorkspacePerDay: 100,
      caseTimeoutMs: 1000,
      embeddingProvider: "openai",
      openaiApiKey: "invalid_key",
    });

    const run: EvalRun = {
      id: "run-1",
      workspaceId: WORKSPACE_ID,
      agentId: AGENT_ID,
      agentVersionId: "v-1",
      datasetId: DATASET_ID,
      datasetSnapshotId: "snap-1",
      datasetRevision: 1,
      policy: {
        method: "semantic_similarity",
        config: { threshold: 0.85 },
        scorerVersion: "v1",
      },
      fixtureConfig: null,
      status: "running",
      caseCount: 1,
      progress: 0,
      score: null,
      passedCount: 0,
      failedCount: 0,
      erroredCount: 0,
      averageLatencyMs: null,
      totalCost: null,
      tokenUsage: null,
      idempotencyKey: null,
      error: null,
      claimedBy: "worker-1",
      claimedAt: new Date(),
      leaseExpiresAt: new Date(),
      fenceToken: "fence-1",
      startedAt: new Date(),
      finishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let insertedResult: any = null;
    (repo as any).insertCaseResult = async (res: any) => {
      insertedResult = res;
    };

    const completed = await service.processRun(run, "fence-1");

    // Must be marked as scorerUnavailable, not passed as a fake score
    assert.equal(insertedResult.passed, false);
    assert.equal(insertedResult.scorerUnavailable, true);
    assert.match(insertedResult.failureReason, /Scorer unavailable/);
    assert.match(insertedResult.executionError, /SCORER_UNAVAILABLE/);

    // Aggregate run discloses unavailable count and reason
    assert.equal(completed.unavailableCount, 1);
    assert.ok(completed.unavailableReason?.includes("scorer unavailability"));
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("EvalService: latency threshold fails cases exceeding maxLatencyMs", async () => {
  const repo = createMockRepo();
  const service = new EvalService(repo, null, {
    maxCasesPerRun: 50,
    maxRunsPerWorkspacePerDay: 100,
    caseTimeoutMs: 1000,
  });

  const run: EvalRun = {
    id: "run-latency",
    workspaceId: WORKSPACE_ID,
    agentId: AGENT_ID,
    agentVersionId: "v-1",
    datasetId: DATASET_ID,
    datasetSnapshotId: "snap-1",
    datasetRevision: 1,
    policy: {
      method: "exact_match",
      config: { maxLatencyMs: 20 }, // synthetic turn latency is 25ms
      scorerVersion: "v1",
    },
    fixtureConfig: null,
    status: "running",
    caseCount: 1,
    progress: 0,
    score: null,
    passedCount: 0,
    failedCount: 0,
    erroredCount: 0,
    averageLatencyMs: null,
    totalCost: null,
    tokenUsage: null,
    idempotencyKey: null,
    error: null,
    claimedBy: "worker-1",
    claimedAt: new Date(),
    leaseExpiresAt: new Date(),
    fenceToken: "fence-1",
    startedAt: new Date(),
    finishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let insertedResult: any = null;
  (repo as any).insertCaseResult = async (res: any) => {
    insertedResult = res;
  };
  (repo as any).listRunCaseSnapshots = async () => [
    {
      runId: "run-latency",
      caseId: "case-lat",
      workspaceId: WORKSPACE_ID,
      caseName: "Latency test",
      input: "test input",
      expectedOutput: "fake-reply:test input", // exact text matches synthetic reply
      expectedTools: [],
      fixtureResponses: [],
    },
  ];

  await service.processRun(run, "fence-1");

  // Even though text matched, case failed because 25ms > 20ms
  assert.equal(insertedResult.passed, false);
  assert.match(insertedResult.failureReason, /exceeded policy threshold/);
});

test("EvalService: createOrGetComparison rejects runs from different datasets", async () => {
  const repo = createMockRepo({
    getRun: async (_ws: string, id: string) => {
      if (id === "a0000000-0000-4000-a000-000000000001") {
        return {
          id,
          agentId: AGENT_ID,
          datasetId: "ds-alpha",
          averageLatencyMs: 100,
          policy: { method: "exact_match", config: {}, scorerVersion: "v1" },
        } as any;
      }
      return {
        id,
        agentId: AGENT_ID,
        datasetId: "ds-beta",
        averageLatencyMs: 120,
        policy: { method: "exact_match", config: {}, scorerVersion: "v1" },
      } as any;
    },
    listResults: async () => [],
  });

  const service = new EvalService(repo, null, {
    maxCasesPerRun: 50,
    maxRunsPerWorkspacePerDay: 100,
    caseTimeoutMs: 1000,
  });

  await assert.rejects(
    async () =>
      service.createOrGetComparison(WORKSPACE_ID, {
        baselineRunId: "a0000000-0000-4000-a000-000000000001",
        candidateRunId: "a0000000-0000-4000-a000-000000000002",
      }),
    (err: any) => {
      assert.match(err?.message || "", /must evaluate against the same dataset/);
      return true;
    },
  );
});

test("EvalService: evaluatePromotionGate enforces pass rates, regressions, and audits overrides", async () => {
  const candidateRun: EvalRun = {
    id: "run-cand",
    workspaceId: WORKSPACE_ID,
    agentId: AGENT_ID,
    agentVersionId: "v-candidate",
    datasetId: DATASET_ID,
    datasetSnapshotId: "snap-1",
    datasetRevision: 1,
    policy: { method: "exact_match", config: {}, scorerVersion: "v1" },
    fixtureConfig: null,
    status: "completed",
    caseCount: 10,
    progress: 10,
    score: 80, // 80% pass rate (below default 90% gate)
    passedCount: 8,
    failedCount: 2,
    erroredCount: 0,
    unavailableCount: 0,
    unavailableReason: null,
    averageLatencyMs: 250,
    totalCost: null,
    tokenUsage: null,
    idempotencyKey: null,
    error: null,
    claimedBy: null,
    claimedAt: null,
    leaseExpiresAt: null,
    fenceToken: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const audits: any[] = [];
  const repo = createMockRepo({
    listRuns: async () => ({
      runs: [candidateRun],
      total: 1,
    }),
    recordGateAudit: async (audit: any) => {
      audits.push(audit);
    },
  });

  const service = new EvalService(repo, null, {
    maxCasesPerRun: 50,
    maxRunsPerWorkspacePerDay: 100,
    caseTimeoutMs: 1000,
  });

  // Check 1: Gate fails when score (80%) is below required threshold (90%)
  const check1 = await service.evaluatePromotionGate(WORKSPACE_ID, {
    agentId: AGENT_ID,
    candidateVersionId: "v-candidate",
    gateConfig: { minPassRatePercent: 90 },
  });
  assert.equal(check1.passed, false);
  assert.equal(check1.blocked, true);
  assert.equal(check1.overridden, false);
  assert.ok(check1.reasons[0].includes("is below required gate threshold"));

  // Check 2: Authorized override allows promotion with immutable audit record
  const check2 = await service.evaluatePromotionGate(WORKSPACE_ID, {
    agentId: AGENT_ID,
    candidateVersionId: "v-candidate",
    gateConfig: { minPassRatePercent: 90 },
    override: {
      approved: true,
      reason: "Emergency hotfix promotion approved by security lead",
      actorUserId: "user-lead-123",
    },
  });
  assert.equal(check2.passed, true);
  assert.equal(check2.blocked, false);
  assert.equal(check2.overridden, true);
  assert.equal(check2.overrideAudit?.actorUserId, "user-lead-123");
  assert.equal(check2.overrideAudit?.reason, "Emergency hotfix promotion approved by security lead");

  // Verify audit was logged in repository
  assert.equal(audits.length, 2);
  assert.equal(audits[1].overridden, true);
  assert.equal(audits[1].overrideReason, "Emergency hotfix promotion approved by security lead");
});
