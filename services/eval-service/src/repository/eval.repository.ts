import type { Pool } from "pg";
import type {
  EvalCase,
  EvalCaseResult,
  EvalRun,
  EvalRunCaseSnapshot,
  EvalRunStatus,
} from "../domain/types.js";

type CaseRow = {
  id: string;
  workspace_id: string;
  agent_id: string;
  name: string;
  input: string;
  expected_output: string;
  created_at: Date;
};

type RunRow = {
  id: string;
  workspace_id: string;
  agent_id: string;
  agent_version_id: string;
  status: EvalRunStatus;
  case_count: number;
  score: string | number | null;
  idempotency_key: string | null;
  error: string | null;
  claimed_by: string | null;
  claimed_at: Date | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type ResultRow = {
  id: string;
  run_id: string;
  case_id: string;
  workspace_id: string;
  passed: boolean;
  expected_output: string;
  actual_output: string | null;
  error: string | null;
  created_at: Date;
};

function toNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapCase(row: CaseRow): EvalCase {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    agentId: row.agent_id,
    name: row.name,
    input: row.input,
    expectedOutput: row.expected_output,
    createdAt: row.created_at,
  };
}

function mapRun(row: RunRow): EvalRun {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    agentId: row.agent_id,
    agentVersionId: row.agent_version_id,
    status: row.status,
    caseCount: row.case_count,
    score: toNumber(row.score),
    idempotencyKey: row.idempotency_key,
    error: row.error,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResult(row: ResultRow): EvalCaseResult {
  return {
    id: row.id,
    runId: row.run_id,
    caseId: row.case_id,
    workspaceId: row.workspace_id,
    passed: row.passed,
    expectedOutput: row.expected_output,
    actualOutput: row.actual_output,
    error: row.error,
    createdAt: row.created_at,
  };
}

export class EvalRepository {
  constructor(private readonly pool: Pool) {}

  async createCase(
    workspaceId: string,
    agentId: string,
    input: { name?: string; input: string; expectedOutput: string },
  ): Promise<EvalCase> {
    const result = await this.pool.query<CaseRow>(
      `INSERT INTO eval_cases (workspace_id, agent_id, name, input, expected_output)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [workspaceId, agentId, (input.name ?? "").slice(0, 200), input.input, input.expectedOutput],
    );
    return mapCase(result.rows[0]);
  }

  async listCases(workspaceId: string, agentId: string): Promise<EvalCase[]> {
    const result = await this.pool.query<CaseRow>(
      `SELECT * FROM eval_cases
       WHERE workspace_id = $1 AND agent_id = $2
       ORDER BY created_at DESC
       LIMIT 500`,
      [workspaceId, agentId],
    );
    return result.rows.map(mapCase);
  }

  async getCasesByIds(
    workspaceId: string,
    agentId: string,
    caseIds: string[],
  ): Promise<EvalCase[]> {
    if (caseIds.length === 0) return [];
    const result = await this.pool.query<CaseRow>(
      `SELECT * FROM eval_cases
       WHERE workspace_id = $1 AND agent_id = $2 AND id = ANY($3::uuid[])`,
      [workspaceId, agentId, caseIds],
    );
    return result.rows.map(mapCase);
  }

  async countRunsToday(workspaceId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM eval_runs
       WHERE workspace_id = $1 AND created_at >= date_trunc('day', NOW())`,
      [workspaceId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async findRunByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<EvalRun | null> {
    const result = await this.pool.query<RunRow>(
      `SELECT * FROM eval_runs WHERE workspace_id = $1 AND idempotency_key = $2`,
      [workspaceId, idempotencyKey],
    );
    return result.rows[0] ? mapRun(result.rows[0]) : null;
  }

  async createRun(input: {
    workspaceId: string;
    agentId: string;
    agentVersionId: string;
    cases: EvalCase[];
    idempotencyKey: string | null;
  }): Promise<EvalRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const runResult = await client.query<RunRow>(
        `INSERT INTO eval_runs (
           workspace_id, agent_id, agent_version_id, status, case_count, idempotency_key
         ) VALUES ($1, $2, $3, 'queued', $4, $5)
         RETURNING *`,
        [
          input.workspaceId,
          input.agentId,
          input.agentVersionId,
          input.cases.length,
          input.idempotencyKey,
        ],
      );
      const run = mapRun(runResult.rows[0]);
      for (const c of input.cases) {
        await client.query(
          `INSERT INTO eval_run_cases (run_id, case_id, workspace_id, input, expected_output)
           VALUES ($1, $2, $3, $4, $5)`,
          [run.id, c.id, input.workspaceId, c.input, c.expectedOutput],
        );
      }
      await client.query("COMMIT");
      return run;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getRun(workspaceId: string, runId: string): Promise<EvalRun | null> {
    const result = await this.pool.query<RunRow>(
      `SELECT * FROM eval_runs WHERE id = $1 AND workspace_id = $2`,
      [runId, workspaceId],
    );
    return result.rows[0] ? mapRun(result.rows[0]) : null;
  }

  async listRuns(workspaceId: string, agentId: string): Promise<EvalRun[]> {
    const result = await this.pool.query<RunRow>(
      `SELECT * FROM eval_runs
       WHERE workspace_id = $1 AND agent_id = $2
       ORDER BY created_at DESC
       LIMIT 100`,
      [workspaceId, agentId],
    );
    return result.rows.map(mapRun);
  }

  async listResults(workspaceId: string, runId: string): Promise<EvalCaseResult[]> {
    const result = await this.pool.query<ResultRow>(
      `SELECT * FROM eval_case_results
       WHERE workspace_id = $1 AND run_id = $2
       ORDER BY created_at ASC`,
      [workspaceId, runId],
    );
    return result.rows.map(mapResult);
  }

  async claimNextRun(workerId: string): Promise<EvalRun | null> {
    const result = await this.pool.query<RunRow>(
      `UPDATE eval_runs
       SET status = 'running',
           claimed_by = $1,
           claimed_at = NOW(),
           started_at = COALESCE(started_at, NOW()),
           updated_at = NOW()
       WHERE id = (
         SELECT id FROM eval_runs
         WHERE status = 'queued'
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *`,
      [workerId],
    );
    return result.rows[0] ? mapRun(result.rows[0]) : null;
  }

  async listRunCaseSnapshots(runId: string): Promise<EvalRunCaseSnapshot[]> {
    const result = await this.pool.query<{
      run_id: string;
      case_id: string;
      workspace_id: string;
      input: string;
      expected_output: string;
    }>(`SELECT * FROM eval_run_cases WHERE run_id = $1`, [runId]);
    return result.rows.map((r) => ({
      runId: r.run_id,
      caseId: r.case_id,
      workspaceId: r.workspace_id,
      input: r.input,
      expectedOutput: r.expected_output,
    }));
  }

  async insertCaseResult(input: {
    runId: string;
    caseId: string;
    workspaceId: string;
    passed: boolean;
    expectedOutput: string;
    actualOutput: string | null;
    error: string | null;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO eval_case_results (
         run_id, case_id, workspace_id, passed, expected_output, actual_output, error
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.runId,
        input.caseId,
        input.workspaceId,
        input.passed,
        input.expectedOutput,
        input.actualOutput,
        input.error,
      ],
    );
  }

  async completeRun(
    runId: string,
    patch: { status: "completed" | "failed"; score: number | null; error: string | null },
  ): Promise<EvalRun> {
    const result = await this.pool.query<RunRow>(
      `UPDATE eval_runs
       SET status = $2,
           score = $3,
           error = $4,
           finished_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [runId, patch.status, patch.score, patch.error],
    );
    return mapRun(result.rows[0]);
  }
}
