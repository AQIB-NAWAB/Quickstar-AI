import assert from "node:assert/strict";
import test from "node:test";
import { classifyExecutionError } from "./errors.js";
import { WorkflowRunner } from "./runner.js";
import { WorkflowsRepository } from "../repository/workflows.repository.js";
import type { WorkflowGraph } from "@quickstart/contracts";

const sampleGraph = (): WorkflowGraph => ({
  schema_version: 1,
  entry_node_id: "trigger",
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      name: "Trigger",
      position: { x: 0, y: 0 },
      config: { event_type: "conversation.created" },
    },
    {
      id: "step1",
      type: "log",
      name: "Step 1",
      position: { x: 1, y: 0 },
      config: { level: "info", message: "Step 1 done" },
    },
    {
      id: "step2",
      type: "log",
      name: "Step 2",
      position: { x: 2, y: 0 },
      config: { level: "info", message: "Step 2 done" },
    },
    {
      id: "end",
      type: "end",
      name: "End",
      position: { x: 3, y: 0 },
      config: { reason: "completed" },
    },
  ],
  edges: [
    { id: "e1", source: "trigger", sourcePort: "received", target: "step1", targetPort: "in" },
    { id: "e2", source: "step1", sourcePort: "next", target: "step2", targetPort: "in" },
    { id: "e3", source: "step2", sourcePort: "next", target: "end", targetPort: "in" },
  ],
});

test("classifyExecutionError accurately identifies retryable, permanent, and uncertain failures", () => {
  // Ambiguous timeouts on writes must be uncertain
  assert.equal(classifyExecutionError(new Error("Request timed out"), true), "uncertain");
  assert.equal(classifyExecutionError({ name: "TimeoutError" }, true), "uncertain");
  assert.equal(classifyExecutionError({ name: "AbortError" }, true), "uncertain");
  assert.equal(classifyExecutionError({ code: "ETIMEDOUT" }, true), "uncertain");

  // Timeouts on safe reads can be retryable
  assert.equal(classifyExecutionError(new Error("Request timed out"), false), "retryable");
  assert.equal(classifyExecutionError({ name: "TimeoutError" }, false), "retryable");

  // Transient rate limiting and server errors
  assert.equal(classifyExecutionError({ status: 429 }), "retryable");
  assert.equal(classifyExecutionError({ status: 502 }), "retryable");
  assert.equal(classifyExecutionError({ status: 503 }), "retryable");
  assert.equal(classifyExecutionError({ status: 504 }), "retryable");
  assert.equal(classifyExecutionError({ code: "ECONNRESET" }), "retryable");
  assert.equal(classifyExecutionError({ code: "ECONNREFUSED" }), "retryable");

  // Permanent client errors must fail closed without retry
  assert.equal(classifyExecutionError({ status: 400 }), "permanent");
  assert.equal(classifyExecutionError({ status: 401 }), "permanent");
  assert.equal(classifyExecutionError({ status: 403 }), "permanent");
  assert.equal(classifyExecutionError({ status: 404 }), "permanent");
  assert.equal(classifyExecutionError(new Error("Invalid schema")), "permanent");
});

test("fencing prevents a stale worker from updating progress when lease token mismatches", async () => {
  let executedQuery = "";
  const mockClient = {
    async query(sql: string, _params?: unknown[]) {
      executedQuery = sql;
      // Simulate zero rows affected when lease token check fails in WHERE clause
      return { rowCount: 0 };
    },
  };

  const repo = new WorkflowsRepository({} as never);
  const updated = await repo.updateRunProgress(mockClient as never, {
    runId: "run-123",
    status: "running",
    currentStepIndex: 2,
    stepsCompleted: 2,
    leaseToken: "11111111-1111-1111-1111-111111111111",
  });

  assert.equal(updated, false, "Expected update to fail due to lease fencing");
  assert.ok(executedQuery.includes("lease_token = $8::uuid"));
  assert.ok(executedQuery.includes("status <> 'canceled'"));
});

test("abandoned run recovery claims expired run, increments attempts, and issues a new lease token", async () => {
  let capturedQuery = "";
  let capturedParams: unknown[] = [];
  const fakePool = {
    async query(sql: string, params: unknown[]) {
      capturedQuery = sql;
      capturedParams = params;
      return {
        rows: [
          {
            id: "run-123",
            lease_token: "22222222-2222-2222-2222-222222222222",
            attempt_count: 2,
          },
        ],
      };
    },
  };

  const repo = new WorkflowsRepository(fakePool as never);
  const claim = await repo.claimAbandonedRun("ws-1", "run-123", "worker-beta", 45000);

  assert.equal(claim.claimed, true);
  assert.equal(claim.leaseToken, "22222222-2222-2222-2222-222222222222");
  assert.equal(claim.attemptCount, 2);
  assert.ok(capturedQuery.includes("attempt_count = attempt_count + 1"));
  assert.ok(capturedQuery.includes("lease_expires_at < NOW()"));
  assert.equal(capturedParams[2], "worker-beta");
});

test("safe step recovery reuses completed step output without re-executing actions", async () => {
  const upsertedSteps: Array<{ stepId: string; status: string }> = [];

  const fakeRepo = {
    beginClient: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    }),
    listCompletedSteps: async (_runId: string) => {
      // Step 1 was completed prior to worker crash!
      return new Map([
        ["step1", { stepId: "step1", stepName: "Step 1", kind: "log", status: "succeeded", output: { logged: true, recorded_previously: true } }],
      ]);
    },
    isRunCanceled: async () => false,
    heartbeatRun: async () => true,
    upsertStep: async (_client: unknown, step: { stepId: string; status: string }) => {
      upsertedSteps.push({ stepId: step.stepId, status: step.status });
    },
    updateRunProgress: async () => true,
    insertSideEffect: async () => ({ inserted: true }),
  };

  const runner = new WorkflowRunner({
    repo: fakeRepo as never,
    logger: { info() {}, warn() {}, error() {}, debug() {} } as never,
    allowHttpWebhooks: true,
    webhookTimeoutMs: 1000,
  });

  const mockRun = {
    id: "run-crash-recovery",
    workspaceId: "ws-1",
    workflowId: "wf-1",
    definitionVersion: 1,
    versionId: null,
    mode: "live" as const,
    replayOfRunId: null,
    status: "running" as const,
    triggeredAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    completedSteps: 1,
    totalSteps: 4,
    stepsSummary: "1 / 4",
    handledErrors: false,
    stepRuns: [],
    definitionSnapshot: {
      draftGraph: sampleGraph(),
      settings: { max_run_duration_seconds: 60 },
    },
    eventPayload: { text: "hello world" },
    eventId: "evt-123",
    triggerEventType: "conversation.created",
  };

  await runner.resumeRun(mockRun, "33333333-3333-3333-3333-333333333333");

  // Step 1 must NOT have been upserted as running or re-executed!
  const step1Executions = upsertedSteps.filter((s) => s.stepId === "step1");
  assert.equal(step1Executions.length, 0, "Previously completed step must not be re-executed");

  // Step 2 should have been executed and succeeded
  const step2Executions = upsertedSteps.filter((s) => s.stepId === "step2" && s.status === "succeeded");
  assert.equal(step2Executions.length, 1, "Subsequent incomplete step should be executed");
});

test("replaying a run preserves lineage to originalRunId and freezes snapshot", async () => {
  let insertedRun: any = null;
  const originalRun = {
    id: "orig-run-999",
    workspace_id: "ws-test",
    workflow_id: "wf-test",
    definition_version: 3,
    version_id: "ver-frozen-1",
    mode: "live",
    event_id: "orig-evt",
    trigger_event_type: "conversation.created",
    event_payload: { user: "alice" },
    steps_total: 4,
    definition_snapshot: { name: "Historic Workflow Snapshot" },
  };

  const fakePool = {
    async query(sql: string, params: unknown[]) {
      if (sql.includes("SELECT * FROM workflow_runs WHERE id = $1")) {
        return { rows: [originalRun] };
      }
      if (sql.includes("SELECT * FROM workflow_versions")) {
        return {
          rows: [
            {
              definition_snapshot: { name: "Version 1 Frozen Definition" },
              graph_snapshot: sampleGraph(),
              settings_snapshot: { timezone: "UTC" },
            },
          ],
        };
      }
      if (sql.includes("INSERT INTO workflow_runs")) {
        insertedRun = {
          id: params[0],
          workspace_id: params[1],
          workflow_id: params[2],
          definition_version: params[3],
          replay_of_run_id: params[10],
          definition_snapshot: JSON.parse(params[11] as string),
        };
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const repo = new WorkflowsRepository(fakePool as never);
  repo.getRun = async (_ws, _wf, id) => ({
    id,
    workspaceId: "ws-test",
    workflowId: "wf-test",
    definitionVersion: 3,
    versionId: "ver-frozen-1",
    mode: "live",
    replayOfRunId: "orig-run-999",
    status: "running",
    triggeredAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    completedSteps: 0,
    totalSteps: 4,
    stepsSummary: "0 / 4",
    handledErrors: false,
    stepRuns: [],
  });

  const replay = await repo.replayRun("ws-test", "wf-test", "orig-run-999", "actor-user-42");

  assert.equal(replay.replayOfRunId, "orig-run-999", "Replay must preserve lineage pointer");
  assert.equal(insertedRun?.replay_of_run_id, "orig-run-999");
  assert.deepEqual((insertedRun?.definition_snapshot as any)?.settings, { timezone: "UTC" });
});
