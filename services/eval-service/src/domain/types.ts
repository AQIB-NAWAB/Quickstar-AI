export type EvalRunStatus = "queued" | "running" | "completed" | "failed";

export type EvalCase = {
  id: string;
  workspaceId: string;
  agentId: string;
  name: string;
  input: string;
  expectedOutput: string;
  createdAt: Date;
};

export type EvalRun = {
  id: string;
  workspaceId: string;
  agentId: string;
  agentVersionId: string;
  status: EvalRunStatus;
  caseCount: number;
  score: number | null;
  idempotencyKey: string | null;
  error: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
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
  passed: boolean;
  expectedOutput: string;
  actualOutput: string | null;
  error: string | null;
  createdAt: Date;
};

export type EvalRunCaseSnapshot = {
  runId: string;
  caseId: string;
  workspaceId: string;
  input: string;
  expectedOutput: string;
};
