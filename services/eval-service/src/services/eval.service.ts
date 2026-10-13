import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { EvalCase, EvalCaseResult, EvalRun } from "../domain/types.js";
import type { EvalRepository } from "../repository/eval.repository.js";
import type { RuntimeEvalClient } from "../clients/runtime.client.js";
import { meanScorePercent, scoreExactMatch } from "../utils/score.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EvalServiceLimits = {
  maxCasesPerRun: number;
  maxRunsPerWorkspacePerDay: number;
  caseTimeoutMs: number;
};

export class EvalService {
  constructor(
    private readonly repo: EvalRepository,
    private readonly runtime: RuntimeEvalClient | null,
    private readonly limits: EvalServiceLimits,
  ) {}

  createCase(
    workspaceId: string,
    agentId: string,
    body: { name?: string; input: string; expected_output?: string; expectedOutput?: string },
  ): Promise<EvalCase> {
    if (!UUID_RE.test(agentId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "agent_id must be a UUID" });
    }
    const input = body.input?.trim() ?? "";
    const expected =
      (body.expected_output ?? body.expectedOutput ?? "").toString().trim();
    if (!input || !expected) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "input and expected_output are required",
      });
    }
    return this.repo.createCase(workspaceId, agentId, {
      name: body.name,
      input,
      expectedOutput: expected,
    });
  }

  listCases(workspaceId: string, agentId: string): Promise<EvalCase[]> {
    return this.repo.listCases(workspaceId, agentId);
  }

  async createRun(
    workspaceId: string,
    agentId: string,
    body: {
      agent_version_id?: string;
      agentVersionId?: string;
      case_ids?: string[];
      caseIds?: string[];
      idempotency_key?: string | null;
      idempotencyKey?: string | null;
    },
  ): Promise<{ run: EvalRun; created: boolean }> {
    if (!UUID_RE.test(agentId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "agent_id must be a UUID" });
    }
    const agentVersionId = (body.agent_version_id ?? body.agentVersionId ?? "").trim();
    if (!UUID_RE.test(agentVersionId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "agent_version_id must be a UUID",
      });
    }

    const idempotencyKey =
      (body.idempotency_key ?? body.idempotencyKey)?.trim() || null;
    if (idempotencyKey) {
      const existing = await this.repo.findRunByIdempotencyKey(workspaceId, idempotencyKey);
      if (existing) return { run: existing, created: false };
    }

    const runsToday = await this.repo.countRunsToday(workspaceId);
    if (runsToday >= this.limits.maxRunsPerWorkspacePerDay) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Run cap exceeded: max ${this.limits.maxRunsPerWorkspacePerDay} runs per workspace per day`,
      });
    }

    const requestedIds = body.case_ids ?? body.caseIds;
    let cases: EvalCase[];
    if (requestedIds && requestedIds.length > 0) {
      cases = await this.repo.getCasesByIds(workspaceId, agentId, requestedIds);
      if (cases.length !== requestedIds.length) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "One or more case_ids were not found in this workspace/agent",
        });
      }
    } else {
      cases = await this.repo.listCases(workspaceId, agentId);
    }

    if (cases.length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "No eval cases to run",
      });
    }
    if (cases.length > this.limits.maxCasesPerRun) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Case cap exceeded: max ${this.limits.maxCasesPerRun} cases per run`,
      });
    }

    try {
      const run = await this.repo.createRun({
        workspaceId,
        agentId,
        agentVersionId,
        cases,
        idempotencyKey,
      });
      return { run, created: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "23505" && idempotencyKey) {
        const existing = await this.repo.findRunByIdempotencyKey(workspaceId, idempotencyKey);
        if (existing) return { run: existing, created: false };
      }
      throw err;
    }
  }

  async getRun(
    workspaceId: string,
    runId: string,
  ): Promise<{ run: EvalRun; results: EvalCaseResult[] }> {
    const run = await this.repo.getRun(workspaceId, runId);
    if (!run) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Eval run not found" });
    }
    const results = await this.repo.listResults(workspaceId, runId);
    return { run, results };
  }

  listRuns(workspaceId: string, agentId: string): Promise<EvalRun[]> {
    return this.repo.listRuns(workspaceId, agentId);
  }

  /**
   * Process one claimed run. When runtime is null (local PGlite proof), synthesize
   * fake-reply:<input> as the scripted model answer.
   */
  async processRun(run: EvalRun, requestId: string = randomUUID()): Promise<EvalRun> {
    const snapshots = await this.repo.listRunCaseSnapshots(run.id);
    let passed = 0;
    let failedHard = false;
    let hardError: string | null = null;

    for (const snap of snapshots) {
      try {
        let actual: string;
        if (this.runtime) {
          const turn = await this.runtime.executeEvalTurn({
            workspaceId: run.workspaceId,
            agentId: run.agentId,
            agentVersionId: run.agentVersionId,
            message: snap.input,
            idempotencyKey: `${run.id}:${snap.caseId}`,
            requestId,
            deadlineMs: this.limits.caseTimeoutMs,
          });
          actual = turn.assistant_text;
        } else {
          actual = `fake-reply:${snap.input}`;
        }
        const ok = scoreExactMatch(snap.expectedOutput, actual);
        if (ok) passed += 1;
        await this.repo.insertCaseResult({
          runId: run.id,
          caseId: snap.caseId,
          workspaceId: run.workspaceId,
          passed: ok,
          expectedOutput: snap.expectedOutput,
          actualOutput: actual,
          error: null,
        });
      } catch (err) {
        failedHard = true;
        hardError = err instanceof Error ? err.message : String(err);
        await this.repo.insertCaseResult({
          runId: run.id,
          caseId: snap.caseId,
          workspaceId: run.workspaceId,
          passed: false,
          expectedOutput: snap.expectedOutput,
          actualOutput: null,
          error: hardError,
        });
      }
    }

    const score = meanScorePercent(passed, snapshots.length);
    return this.repo.completeRun(run.id, {
      status: failedHard ? "failed" : "completed",
      score,
      error: hardError,
    });
  }
}
