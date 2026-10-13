import {
  gatewayFetch,
  getAccessTokenFromCookies,
} from "@/lib/server/gateway/fetch";
import type {
  EvaluationCase,
  EvaluationCaseResult,
  EvaluationDataset,
  EvaluationOverviewData,
  EvaluationRepository,
  EvaluationRun,
  RepositoryResult,
  RunStatus,
} from "./types";

type AgentRow = { id: string; name: string; production_version_id?: string | null };
type CaseRow = {
  id: string;
  agent_id: string;
  name?: string;
  input: string;
  expected_output: string;
  created_at: string;
};
type RunRow = {
  id: string;
  workspace_id: string;
  agent_id: string;
  agent_version_id: string;
  status: string;
  case_count: number;
  score: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};
type ResultRow = {
  id: string;
  run_id: string;
  case_id: string;
  passed: boolean;
  expected_output: string;
  actual_output: string;
  error: string | null;
};

function fail<T>(status: number, message: string): RepositoryResult<T> {
  if (status === 0) return { status: "unavailable", message };
  if (status === 403) return { status: "forbidden", message };
  if (status === 404) return { status: "not_found", message };
  return { status: "error", message };
}

async function token(): Promise<string | null> {
  return getAccessTokenFromCookies();
}

function mapCase(c: CaseRow, datasetId: string): EvaluationCase {
  return {
    id: c.id,
    datasetId,
    name: c.name ?? (c.input.slice(0, 40) || "Case"),
    input: c.input,
    expectedOutput: c.expected_output,
    expectedTools: [],
    createdAt: c.created_at,
  };
}

function mapRun(r: RunRow, agentName: string): EvaluationRun {
  const passed =
    typeof r.score === "number" && r.case_count > 0
      ? Math.round((r.score / 100) * r.case_count)
      : null;
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    agentId: r.agent_id,
    agentName,
    versionId: r.agent_version_id,
    displayVersion: r.agent_version_id.slice(0, 8),
    datasetId: r.agent_id,
    datasetName: `${agentName} cases`,
    datasetRevision: 1,
    scoringPolicy: "exact-match-v1",
    status: r.status as RunStatus,
    overallScore: r.score,
    scoreScale: 100,
    passedCount: passed,
    failedCount: passed != null ? r.case_count - passed : null,
    totalCases: r.case_count,
    startedAt: r.started_at ?? r.created_at,
    completedAt: r.finished_at ?? undefined,
  };
}

async function listAgents(workspaceId: string, accessToken: string) {
  return gatewayFetch<{ agents: AgentRow[] }>(
    `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents`,
    { accessToken },
  );
}

export const apiEvaluationRepository: EvaluationRepository = {
  async listDatasets(workspaceId) {
    const accessToken = await token();
    if (!accessToken) return fail(401, "Not signed in");
    const agentsRes = await listAgents(workspaceId, accessToken);
    if (!agentsRes.ok) return fail(agentsRes.status, agentsRes.error.message);
    const datasets: EvaluationDataset[] = [];
    for (const agent of agentsRes.data.agents ?? []) {
      const casesRes = await gatewayFetch<{ cases: CaseRow[] }>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agent.id)}/eval/cases`,
        { accessToken },
      );
      const cases = casesRes.ok ? (casesRes.data.cases ?? []) : [];
      datasets.push({
        id: agent.id,
        workspaceId,
        name: `${agent.name} cases`,
        description: "Cases stored on the agent (eval-service v1 has no separate datasets).",
        revision: 1,
        caseCount: cases.length,
        updatedAt: cases[0]?.created_at ?? new Date().toISOString(),
        createdAt: cases[0]?.created_at ?? new Date().toISOString(),
      });
    }
    return { status: "ready", data: datasets };
  },

  async getDataset(workspaceId, datasetId) {
    const accessToken = await token();
    if (!accessToken) return fail(401, "Not signed in");
    const agentsRes = await listAgents(workspaceId, accessToken);
    if (!agentsRes.ok) return fail(agentsRes.status, agentsRes.error.message);
    const agent = (agentsRes.data.agents ?? []).find((a) => a.id === datasetId);
    if (!agent) return { status: "not_found", message: "Dataset (agent) not found" };
    const casesRes = await gatewayFetch<{ cases: CaseRow[] }>(
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(datasetId)}/eval/cases`,
      { accessToken },
    );
    if (!casesRes.ok) return fail(casesRes.status, casesRes.error.message);
    const cases = (casesRes.data.cases ?? []).map((c) => mapCase(c, datasetId));
    return {
      status: "ready",
      data: {
        dataset: {
          id: datasetId,
          workspaceId,
          name: `${agent.name} cases`,
          revision: 1,
          caseCount: cases.length,
          updatedAt: cases[0]?.createdAt ?? new Date().toISOString(),
          createdAt: cases[0]?.createdAt ?? new Date().toISOString(),
        },
        cases,
      },
    };
  },

  async createDataset() {
    return {
      status: "unavailable",
      message:
        "Eval v1 stores cases per agent. Open an agent and add cases via the eval API, or use Save test case on an agent dataset.",
    };
  },

  async saveTestCase(workspaceId, datasetId, caseData) {
    const accessToken = await token();
    if (!accessToken) return fail(401, "Not signed in");
    const res = await gatewayFetch<{ case: CaseRow }>(
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(datasetId)}/eval/cases`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify({
          name: caseData.name,
          input: caseData.input,
          expected_output: caseData.expectedOutput ?? "",
        }),
      },
    );
    if (!res.ok) return fail(res.status, res.error.message);
    return { status: "ready", data: mapCase(res.data.case, datasetId) };
  },

  async importCases(workspaceId, datasetId, cases) {
    let imported = 0;
    for (const c of cases) {
      if (!c.input) continue;
      const r = await this.saveTestCase(workspaceId, datasetId, {
        name: c.name ?? c.input.slice(0, 40),
        input: c.input,
        expectedOutput: c.expectedOutput ?? "",
      });
      if (r.status === "ready") imported += 1;
    }
    return { status: "ready", data: { importedCount: imported, newRevision: 1 } };
  },

  async listRuns(workspaceId, filter) {
    const accessToken = await token();
    if (!accessToken) return fail(401, "Not signed in");
    const agentsRes = await listAgents(workspaceId, accessToken);
    if (!agentsRes.ok) return fail(agentsRes.status, agentsRes.error.message);
    const agents = (agentsRes.data.agents ?? []).filter((a) =>
      filter?.agentId ? a.id === filter.agentId : true,
    );
    const runs: EvaluationRun[] = [];
    for (const agent of agents) {
      const runsRes = await gatewayFetch<{ runs: RunRow[] }>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agent.id)}/eval/runs`,
        { accessToken },
      );
      if (!runsRes.ok) continue;
      for (const run of runsRes.data.runs ?? []) {
        if (filter?.status && run.status !== filter.status) continue;
        runs.push(mapRun(run, agent.name));
      }
    }
    runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return { status: "ready", data: runs };
  },

  async getRun(workspaceId, runId) {
    const accessToken = await token();
    if (!accessToken) return fail(401, "Not signed in");
    const agentsRes = await listAgents(workspaceId, accessToken);
    if (!agentsRes.ok) return fail(agentsRes.status, agentsRes.error.message);
    for (const agent of agentsRes.data.agents ?? []) {
      const res = await gatewayFetch<{ run: RunRow; results: ResultRow[] }>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agent.id)}/eval/runs/${encodeURIComponent(runId)}`,
        { accessToken },
      );
      if (!res.ok) continue;
      const run = mapRun(res.data.run, agent.name);
      const results: EvaluationCaseResult[] = (res.data.results ?? []).map((r) => ({
        runCaseId: r.id,
        runId: r.run_id,
        caseId: r.case_id,
        caseName: r.case_id.slice(0, 8),
        input: "",
        expectedOutput: r.expected_output,
        actualOutput: r.actual_output,
        expectedTools: [],
        actualTools: [],
        outcome: r.error ? "error" : r.passed ? "passed" : "failed",
        score: r.passed ? 100 : 0,
        scoreScale: 100,
        executionError: r.error ?? undefined,
      }));
      return { status: "ready", data: { run, results } };
    }
    return { status: "not_found", message: "Eval run not found" };
  },

  async startRun(workspaceId, data) {
    const accessToken = await token();
    if (!accessToken) return fail(401, "Not signed in");
    const agentId = data.agentId || data.datasetId;
    const res = await gatewayFetch<{ run: RunRow }>(
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/eval/runs`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify({
          agent_version_id: data.versionId,
          idempotency_key: `ui-eval:${workspaceId}:${agentId}:${Date.now()}`,
        }),
      },
    );
    if (!res.ok) return fail(res.status, res.error.message);
    const agentsRes = await listAgents(workspaceId, accessToken);
    const agentName =
      (agentsRes.ok ? agentsRes.data.agents : [])?.find((a) => a.id === agentId)?.name ?? "Agent";
    return { status: "ready", data: mapRun(res.data.run, agentName) };
  },

  async getOverview(workspaceId, agentId, datasetId) {
    const dsId = datasetId ?? agentId;
    const [datasetRes, runsRes] = await Promise.all([
      this.getDataset(workspaceId, dsId),
      this.listRuns(workspaceId, { agentId }),
    ]);
    if (datasetRes.status !== "ready") return datasetRes;
    if (runsRes.status !== "ready") return runsRes;
    const latest = runsRes.data[0] ?? null;
    return {
      status: "ready",
      data: {
        agentId,
        agentName: latest?.agentName ?? "Agent",
        selectedDataset: datasetRes.data.dataset,
        scoringPolicy: "exact-match-v1",
        latestScore: latest?.overallScore ?? null,
        scoreScale: 100,
        passedCases: latest?.passedCount ?? null,
        failedCases: latest?.failedCount ?? null,
        totalCases: datasetRes.data.cases.length,
        latestRun: latest,
        comparison: [],
        datasets: [datasetRes.data.dataset],
        recentRuns: runsRes.data.slice(0, 10),
      } satisfies EvaluationOverviewData,
    };
  },
};
