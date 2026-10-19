import type {
  EvaluationCase,
  EvaluationCaseResult,
  EvaluationDataset,
  EvaluationRun,
  EvaluationSummary,
  ScoringMethod,
} from "./types";

export function mapApiDataset(raw: any): EvaluationDataset {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id ?? raw.workspaceId,
    agentId: raw.agent_id ?? raw.agentId ?? "",
    agentName: raw.agent_name ?? raw.agentName,
    name: raw.name ?? "Untitled Dataset",
    description: raw.description ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    revision: Number(raw.revision ?? 1),
    recordVersion: Number(raw.record_version ?? raw.recordVersion ?? 1),
    caseCount: Number(raw.case_count ?? raw.caseCount ?? 0),
    lastEvaluatedVersion: raw.last_evaluated_version ?? raw.lastEvaluatedVersion ?? null,
    lastPassRate: raw.last_pass_rate != null ? Number(raw.last_pass_rate) : (raw.lastPassRate != null ? Number(raw.lastPassRate) : null),
    archivedAt: raw.archived_at ?? raw.archivedAt ?? null,
    createdAt: typeof raw.created_at === "string" ? raw.created_at : (typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()),
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : (typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()),
  };
}

export function mapApiCase(raw: any): EvaluationCase {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id ?? raw.workspaceId,
    agentId: raw.agent_id ?? raw.agentId ?? "",
    datasetId: raw.dataset_id ?? raw.datasetId,
    name: raw.name ?? "",
    input: raw.input ?? "",
    expectedOutput: raw.expected_output ?? raw.expectedOutput ?? "",
    expectedTools: Array.isArray(raw.expected_tools ?? raw.expectedTools) ? (raw.expected_tools ?? raw.expectedTools) : [],
    fixtureResponses: Array.isArray(raw.fixture_responses ?? raw.fixtureResponses) ? (raw.fixture_responses ?? raw.fixtureResponses) : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    recordVersion: Number(raw.record_version ?? raw.recordVersion ?? 1),
    createdAt: typeof raw.created_at === "string" ? raw.created_at : (typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()),
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : (typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()),
  };
}

export function mapApiRun(raw: any): EvaluationRun {
  const policyRaw = raw.policy ?? {};
  return {
    id: raw.id,
    workspaceId: raw.workspace_id ?? raw.workspaceId,
    agentId: raw.agent_id ?? raw.agentId,
    agentName: raw.agent_name ?? raw.agentName,
    agentVersionId: raw.agent_version_id ?? raw.agentVersionId ?? "",
    displayVersion: raw.display_version ?? raw.displayVersion ?? (raw.agent_version_id ? `v${String(raw.agent_version_id).slice(0, 4)}` : undefined),
    datasetId: raw.dataset_id ?? raw.datasetId ?? null,
    datasetName: raw.dataset_name ?? raw.datasetName,
    datasetSnapshotId: raw.dataset_snapshot_id ?? raw.datasetSnapshotId ?? null,
    datasetRevision: Number(raw.dataset_revision ?? raw.datasetRevision ?? 1),
    policy: {
      method: (policyRaw.method as ScoringMethod) || "exact_match",
      config: policyRaw.config ?? {},
      scorerVersion: policyRaw.scorer_version ?? policyRaw.scorerVersion ?? "v1",
    },
    fixtureConfig: raw.fixture_config ?? raw.fixtureConfig ?? null,
    status: raw.status ?? "queued",
    caseCount: Number(raw.case_count ?? raw.caseCount ?? 0),
    progress: Number(raw.progress ?? 0),
    score: raw.score != null ? Number(raw.score) : null,
    passedCount: Number(raw.passed_count ?? raw.passedCount ?? 0),
    failedCount: Number(raw.failed_count ?? raw.failedCount ?? 0),
    erroredCount: Number(raw.errored_count ?? raw.erroredCount ?? 0),
    averageLatencyMs: raw.average_latency_ms != null ? Number(raw.average_latency_ms) : (raw.averageLatencyMs != null ? Number(raw.averageLatencyMs) : null),
    totalCost: raw.total_cost != null ? Number(raw.total_cost) : (raw.totalCost != null ? Number(raw.totalCost) : null),
    tokenUsage: raw.token_usage ?? raw.tokenUsage ?? null,
    idempotencyKey: raw.idempotency_key ?? raw.idempotencyKey ?? null,
    error: raw.error ?? null,
    startedAt: raw.started_at ?? raw.startedAt ?? null,
    finishedAt: raw.finished_at ?? raw.finishedAt ?? null,
    createdAt: typeof raw.created_at === "string" ? raw.created_at : (typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()),
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : (typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()),
  };
}

export function mapApiCaseResult(raw: any): EvaluationCaseResult {
  return {
    id: raw.id,
    runId: raw.run_id ?? raw.runId,
    caseId: raw.case_id ?? raw.caseId,
    workspaceId: raw.workspace_id ?? raw.workspaceId,
    caseName: raw.case_name ?? raw.caseName ?? (raw.case_id ? String(raw.case_id).slice(0, 8) : "Case"),
    input: raw.input ?? "",
    expectedOutput: raw.expected_output ?? raw.expectedOutput ?? "",
    actualOutput: raw.actual_output ?? raw.actualOutput ?? null,
    expectedTools: Array.isArray(raw.expected_tools ?? raw.expectedTools) ? (raw.expected_tools ?? raw.expectedTools) : [],
    actualTools: Array.isArray(raw.actual_tools ?? raw.actualTools) ? (raw.actual_tools ?? raw.actualTools) : [],
    passed: Boolean(raw.passed),
    score: raw.score != null ? Number(raw.score) : null,
    scoringMethod: (raw.scoring_method ?? raw.scoringMethod ?? "exact_match") as ScoringMethod,
    failureReason: raw.failure_reason ?? raw.failureReason ?? null,
    executionError: raw.execution_error ?? raw.executionError ?? null,
    latencyMs: raw.latency_ms != null ? Number(raw.latency_ms) : (raw.latencyMs != null ? Number(raw.latencyMs) : null),
    tokenUsage: raw.token_usage ?? raw.tokenUsage ?? null,
    error: raw.error ?? null,
    createdAt: typeof raw.created_at === "string" ? raw.created_at : (typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()),
  };
}

export function mapApiSummary(raw: any): EvaluationSummary {
  return {
    averagePassRate: raw.average_pass_rate != null ? Number(raw.average_pass_rate) : (raw.averagePassRate != null ? Number(raw.averagePassRate) : null),
    averagePassRateDelta: raw.average_pass_rate_delta != null ? Number(raw.average_pass_rate_delta) : (raw.averagePassRateDelta != null ? Number(raw.averagePassRateDelta) : null),
    evaluatedRuns: Number(raw.evaluated_runs ?? raw.evaluatedRuns ?? 0),
    evaluatedRunsDelta: raw.evaluated_runs_delta != null ? Number(raw.evaluated_runs_delta) : (raw.evaluatedRunsDelta != null ? Number(raw.evaluatedRunsDelta) : null),
    activeTestCases: Number(raw.active_test_cases ?? raw.activeTestCases ?? 0),
    regressionsFlagged: Number(raw.regressions_flagged ?? raw.regressionsFlagged ?? 0),
    period: raw.period ?? "30d",
  };
}
