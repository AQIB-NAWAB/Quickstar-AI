export interface EvaluationDataset {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  revision: number;
  caseCount: number;
  updatedAt: string; // ISO string
  createdAt: string;
}

export interface EvaluationCase {
  id: string;
  datasetId: string;
  name: string;
  input: string;
  expectedOutput: string;
  expectedTools: string[];
  createdAt: string;
}

export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type CaseOutcome = "passed" | "failed" | "error";

export interface EvaluationRun {
  id: string;
  workspaceId: string;
  agentId: string;
  agentName: string;
  versionId: string;
  displayVersion: string; // e.g. "v8"
  datasetId: string;
  datasetName: string;
  datasetRevision: number;
  scoringPolicy: string; // e.g. "support-v1"
  status: RunStatus;
  overallScore: number | null;
  scoreScale: number; // e.g. 100
  passedCount: number | null;
  failedCount: number | null;
  totalCases: number;
  startedAt: string;
  completedAt?: string;
}

export interface EvaluationCaseResult {
  runCaseId: string;
  runId: string;
  caseId: string;
  caseName: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  expectedTools: string[];
  actualTools: string[];
  outcome: CaseOutcome;
  score: number;
  scoreScale: number;
  failureReasons?: string[];
  executionError?: string;
}

export interface VersionComparisonPoint {
  version: string;
  score: number;
  passed: number;
  total: number;
  date: string;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface EvaluationOverviewData {
  agentId: string;
  agentName: string;
  selectedDataset: EvaluationDataset;
  scoringPolicy: string;
  latestScore: number | null;
  scoreScale: number;
  passedCases: number | null;
  failedCases: number | null;
  totalCases: number;
  latestRun: EvaluationRun | null;
  comparison: VersionComparisonPoint[];
  datasets: EvaluationDataset[];
  recentRuns: EvaluationRun[];
}

export interface EvaluationRepository {
  getOverview(
    workspaceId: string,
    agentId: string,
    datasetId?: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<EvaluationOverviewData>>;

  listDatasets(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<EvaluationDataset[]>>;

  getDataset(
    workspaceId: string,
    datasetId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<{ dataset: EvaluationDataset; cases: EvaluationCase[] }>>;

  createDataset(
    workspaceId: string,
    data: { name: string; description?: string }
  ): Promise<RepositoryResult<EvaluationDataset>>;

  saveTestCase(
    workspaceId: string,
    datasetId: string,
    caseData: Partial<EvaluationCase> & { input: string; name: string }
  ): Promise<RepositoryResult<EvaluationCase>>;

  importCases(
    workspaceId: string,
    datasetId: string,
    cases: Partial<EvaluationCase>[]
  ): Promise<RepositoryResult<{ importedCount: number; newRevision: number }>>;

  listRuns(
    workspaceId: string,
    filter?: { agentId?: string; status?: string },
    signal?: AbortSignal
  ): Promise<RepositoryResult<EvaluationRun[]>>;

  getRun(
    workspaceId: string,
    runId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<{ run: EvaluationRun; results: EvaluationCaseResult[] }>>;

  startRun(
    workspaceId: string,
    data: { agentId: string; versionId: string; datasetId: string }
  ): Promise<RepositoryResult<EvaluationRun>>;
}
