export type EvalRunStatus = "queued" | "running" | "completed" | "failed";

export type ScoringMethod = "exact_match" | "semantic_similarity" | "tool_trace";

export type ExpectedToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  order?: number;
};

export type FixtureResponse = {
  toolName: string;
  matchArgs?: Record<string, unknown>;
  response: Record<string, unknown>;
};

export type EvalPolicy = {
  method: ScoringMethod;
  config: {
    threshold?: number;
    requireOrder?: boolean;
    allowUnexpectedTools?: boolean;
    model?: string;
    [key: string]: unknown;
  };
  scorerVersion: string;
};

export type EvalDataset = {
  id: string;
  workspaceId: string;
  agentId: string;
  name: string;
  description: string | null;
  tags: string[];
  revision: number;
  recordVersion: number;
  caseCount: number;
  lastEvaluatedVersion?: string | null;
  lastPassRate?: number | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EvalCase = {
  id: string;
  workspaceId: string;
  agentId: string;
  datasetId: string;
  name: string;
  input: string;
  expectedOutput: string;
  expectedTools: ExpectedToolCall[];
  fixtureResponses: FixtureResponse[];
  tags: string[];
  recordVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type EvalDatasetSnapshot = {
  id: string;
  datasetId: string;
  workspaceId: string;
  agentId: string;
  revision: number;
  datasetName: string;
  cases: EvalCase[];
  schemaVersion: number;
  createdAt: Date;
};

export type EvalRun = {
  id: string;
  workspaceId: string;
  agentId: string;
  agentVersionId: string;
  datasetId: string | null;
  datasetSnapshotId: string | null;
  datasetRevision: number;
  policy: EvalPolicy;
  fixtureConfig: Record<string, unknown> | null;
  status: EvalRunStatus;
  caseCount: number;
  progress: number;
  score: number | null;
  passedCount: number;
  failedCount: number;
  erroredCount: number;
  averageLatencyMs: number | null;
  totalCost: number | null;
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  idempotencyKey: string | null;
  error: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  leaseExpiresAt: Date | null;
  fenceToken: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EvalCaseResult = {
  id: string;
  runId: string;
  caseId: string;
  workspaceId: string;
  caseName: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  expectedTools: ExpectedToolCall[];
  actualTools: Array<{ name: string; arguments?: Record<string, unknown>; status?: string }>;
  passed: boolean;
  score: number | null;
  scoringMethod: ScoringMethod;
  failureReason: string | null;
  executionError: string | null;
  latencyMs: number | null;
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  error: string | null;
  createdAt: Date;
};

export type EvalRunCaseSnapshot = {
  runId: string;
  caseId: string;
  workspaceId: string;
  caseName: string;
  input: string;
  expectedOutput: string;
  expectedTools: ExpectedToolCall[];
  fixtureResponses: FixtureResponse[];
};

export type ComparisonCategoryItem = {
  caseId: string;
  caseName: string;
  baselinePassed: boolean;
  candidatePassed: boolean;
  baselineOutput?: string | null;
  candidateOutput?: string | null;
  expectedOutput?: string;
  status: "fixed" | "regressed" | "unchanged_passed" | "unchanged_failed";
};

export type EvalComparison = {
  id: string;
  workspaceId: string;
  agentId: string;
  baselineRunId: string;
  candidateRunId: string;
  datasetId: string | null;
  datasetRevision: number | null;
  compatibilityFingerprint: string;
  matchedCaseCount: number;
  fixedCount: number;
  regressedCount: number;
  unchangedPassedCount: number;
  unchangedFailedCount: number;
  baselinePassRate: number;
  candidatePassRate: number;
  deltaPercentagePoints: number;
  latencyDeltaMs: number | null;
  categories: {
    fixed: ComparisonCategoryItem[];
    regressed: ComparisonCategoryItem[];
    unchangedPassed: ComparisonCategoryItem[];
    unchangedFailed: ComparisonCategoryItem[];
  };
  createdAt: Date;
};

export type EvalSummary = {
  averagePassRate: number | null;
  averagePassRateDelta: number | null;
  evaluatedRuns: number;
  evaluatedRunsDelta: number | null;
  activeTestCases: number;
  regressionsFlagged: number;
  period: string;
};
