import type {
  RepositoryResult,
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRun,
  WorkflowStatus,
  ConditionGroup,
  WorkflowAction,
} from "./types";

type ApiError = { code?: string; message: string };

async function bff<T>(path: string, init?: RequestInit): Promise<{ status: number; data?: T; error?: ApiError }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: ApiError;
    };
    if (!res.ok) {
      return {
        status: res.status,
        error: body.error ?? { code: `HTTP_${res.status}`, message: res.statusText || "Request failed" },
      };
    }
    return { status: res.status, data: body as unknown as T };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return {
      status: 0,
      error: { code: "NETWORK_ERROR", message: err instanceof Error ? err.message : "Network request failed" },
    };
  }
}

function mapListItem(raw: Record<string, unknown>): WorkflowListItem {
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspace_id ?? raw.workspaceId),
    name: String(raw.name),
    description: (raw.description as string | null) ?? null,
    status: raw.status as WorkflowStatus,
    triggerEventType: String(raw.trigger_event_type ?? raw.triggerEventType ?? ""),
    lastTriggeredAt: (raw.last_triggered_at as string | null) ?? null,
    successRate7d:
      raw.success_rate_7d === null || raw.success_rate_7d === undefined
        ? null
        : Number(raw.success_rate_7d),
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()),
  };
}

function mapDefinition(raw: Record<string, unknown>): WorkflowDefinition {
  const trigger = (raw.trigger as Record<string, unknown> | undefined) ?? {};
  const actionsRaw = Array.isArray(raw.actions) ? raw.actions : [];
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspace_id ?? raw.workspaceId),
    name: String(raw.name),
    description: (raw.description as string | null) ?? null,
    status: raw.status as WorkflowStatus,
    version: typeof raw.version === "number" ? raw.version : 1,
    trigger: {
      id: String(trigger.id ?? `trigger-${raw.id}`),
      eventType: String(trigger.event_type ?? trigger.eventType ?? raw.trigger_event_type ?? ""),
    },
    conditionGroup: (raw.condition_group as ConditionGroup | null | undefined) ?? null,
    actions: actionsRaw.map((item) => {
      const action = item as Record<string, unknown>;
      return {
        id: String(action.id),
        kind: action.kind as WorkflowAction["kind"],
        displayName: String(action.display_name ?? action.displayName ?? action.kind),
        config: (action.config as WorkflowAction["config"]) ?? { name: String(action.kind) },
      };
    }),
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()),
  };
}

function mapRun(raw: Record<string, unknown>): WorkflowRun {
  const steps = Array.isArray(raw.step_runs) ? raw.step_runs : [];
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspace_id ?? raw.workspaceId),
    workflowId: String(raw.workflow_id ?? raw.workflowId),
    definitionVersion: typeof raw.definition_version === "number" ? raw.definition_version : undefined,
    status: raw.status as WorkflowRun["status"],
    triggeredAt: String(raw.triggered_at ?? raw.triggeredAt),
    completedAt: (raw.completed_at as string | null) ?? null,
    durationMs: (raw.duration_ms as number | null) ?? null,
    completedSteps: Number(raw.completed_steps ?? raw.completedSteps ?? 0),
    totalSteps: Number(raw.total_steps ?? raw.totalSteps ?? 0),
    stepsSummary: String(raw.steps_summary ?? raw.stepsSummary ?? ""),
    stepRuns: steps.map((item) => {
      const step = item as Record<string, unknown>;
      return {
        stepId: String(step.step_id ?? step.stepId),
        stepName: String(step.step_name ?? step.stepName),
        kind: step.kind as WorkflowRun["stepRuns"][number]["kind"],
        status: step.status as WorkflowRun["status"],
        durationMs: (step.duration_ms as number | null) ?? null,
        summary: String(step.summary ?? ""),
        inputs: (step.inputs as Record<string, unknown> | null) ?? null,
        output: (step.output as Record<string, unknown> | null) ?? null,
        error: (step.error as WorkflowRun["stepRuns"][number]["error"]) ?? null,
      };
    }),
  };
}

function failResult<T>(status: number, error?: ApiError): RepositoryResult<T> {
  if (status === 404) return { status: "not_found", message: error?.message ?? "Not found" };
  if (status === 403) return { status: "forbidden", message: error?.message ?? "Forbidden" };
  if (status === 0 || status >= 500) {
    return {
      status: "unavailable",
      message: error?.message ?? "Workflow automation is not available yet.",
    };
  }
  return { status: "error", message: error?.message ?? "Request failed" };
}

function toResult<T>(status: number, data: T | undefined, error?: ApiError): RepositoryResult<T> {
  if (error || data === undefined) {
    return failResult<T>(status, error);
  }
  return { status: "ready", data };
}

export async function listWorkflowsApi(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<WorkflowListItem[]>> {
  const { status, data, error } = await bff<{ workflows: Record<string, unknown>[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows`,
    { signal },
  );
  if (error || !data) return failResult(status, error);
  return toResult(status, (data.workflows ?? []).map(mapListItem));
}

export async function getWorkflowApi(
  workspaceId: string,
  workflowId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<WorkflowDefinition>> {
  const { status, data, error } = await bff<{ workflow: Record<string, unknown> }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows/${encodeURIComponent(workflowId)}`,
    { signal },
  );
  if (error || !data?.workflow) return failResult(status, error);
  return toResult(status, mapDefinition(data.workflow));
}

export async function saveWorkflowApi(
  workspaceId: string,
  workflow: WorkflowDefinition,
): Promise<RepositoryResult<WorkflowDefinition>> {
  const payload = {
    name: workflow.name,
    description: workflow.description,
    status: workflow.status,
    expected_version: workflow.version ?? 1,
    version: workflow.version ?? 1,
    trigger: { event_type: workflow.trigger.eventType },
    trigger_event_type: workflow.trigger.eventType,
    condition_group: workflow.conditionGroup ?? null,
    actions: workflow.actions.map((a) => ({
      id: a.id,
      kind: a.kind,
      display_name: a.displayName,
      config: a.config,
    })),
  };

  const isNew = workflow.id === "new" || workflow.id.startsWith("new-");
  const { status, data, error } = await bff<{ workflow: Record<string, unknown> }>(
    isNew
      ? `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows`
      : `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows/${encodeURIComponent(workflow.id)}`,
    {
      method: isNew ? "POST" : "PUT",
      body: JSON.stringify(payload),
    },
  );
  if (error || !data?.workflow) return failResult(status, error);
  return toResult(status, mapDefinition(data.workflow));
}

export async function deleteWorkflowApi(
  workspaceId: string,
  workflowId: string,
): Promise<RepositoryResult<boolean>> {
  const { status, data, error } = await bff<{ deleted?: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows/${encodeURIComponent(workflowId)}`,
    { method: "DELETE" },
  );
  if (error) return failResult(status, error);
  return toResult(status, Boolean(data?.deleted));
}

export async function listRunsApi(
  workspaceId: string,
  workflowId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<WorkflowRun[]>> {
  const { status, data, error } = await bff<{ runs: Record<string, unknown>[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows/${encodeURIComponent(workflowId)}/runs`,
    { signal },
  );
  if (error || !data) return failResult(status, error);
  return toResult(status, (data.runs ?? []).map(mapRun));
}

export async function getRunApi(
  workspaceId: string,
  workflowId: string,
  runId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<WorkflowRun>> {
  const { status, data, error } = await bff<{ run: Record<string, unknown> }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}`,
    { signal },
  );
  if (error || !data?.run) return failResult(status, error);
  return toResult(status, mapRun(data.run));
}
