import {
SAMPLE_PAYMENT_ESCALATION_WORKFLOW,
SAMPLE_RUNS,
SAMPLE_WORKFLOW_ITEMS,
} from "./fixtures";
import type {
RepositoryResult,
WorkflowDefinition,
WorkflowListItem,
WorkflowRepository,
WorkflowRun,
} from "./types";

class InMemoryPreviewStore implements WorkflowRepository {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private listItems: Map<string, WorkflowListItem> = new Map();
  private runs: Map<string, WorkflowRun[]> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.workflows.clear();
    this.listItems.clear();
    this.runs.clear();

    // Initialize with approved sample data
    this.workflows.set(
      SAMPLE_PAYMENT_ESCALATION_WORKFLOW.id,
      JSON.parse(JSON.stringify(SAMPLE_PAYMENT_ESCALATION_WORKFLOW)),
    );

    SAMPLE_WORKFLOW_ITEMS.forEach((item) => {
      this.listItems.set(item.id, JSON.parse(JSON.stringify(item)));
    });

    this.runs.set(
      SAMPLE_PAYMENT_ESCALATION_WORKFLOW.id,
      JSON.parse(JSON.stringify(SAMPLE_RUNS)),
    );
  }

  async listWorkflows(
    _workspaceId: string,
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<WorkflowListItem[]>> {
    void _workspaceId;
    void _signal;
    return {
      status: "ready",
      data: Array.from(this.listItems.values()),
    };
  }

  async getWorkflow(
    _workspaceId: string,
    workflowId: string,
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<WorkflowDefinition>> {
    void _workspaceId;
    void _signal;
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      return { status: "not_found", message: `Workflow "${workflowId}" was not found.` };
    }
    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(wf)),
    };
  }

  async saveWorkflow(
    _workspaceId: string,
    workflow: WorkflowDefinition,
  ): Promise<RepositoryResult<WorkflowDefinition>> {
    void _workspaceId;
    const updated: WorkflowDefinition = {
      ...workflow,
      updatedAt: new Date().toISOString(),
      version: (workflow.version ?? 0) + 1,
    };

    this.workflows.set(workflow.id, JSON.parse(JSON.stringify(updated)));

    // Update list item
    const existingListItem = this.listItems.get(workflow.id);
    this.listItems.set(workflow.id, {
      id: workflow.id,
      workspaceId: workflow.workspaceId,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      triggerEventType: workflow.trigger.eventType,
      lastTriggeredAt: existingListItem?.lastTriggeredAt ?? null,
      successRate7d: existingListItem?.successRate7d ?? null,
      createdAt: existingListItem?.createdAt ?? new Date().toISOString(),
      updatedAt: updated.updatedAt!,
    });

    return {
      status: "ready",
      data: updated,
    };
  }

  async deleteWorkflow(
    _workspaceId: string,
    workflowId: string,
  ): Promise<RepositoryResult<boolean>> {
    void _workspaceId;
    this.workflows.delete(workflowId);
    this.listItems.delete(workflowId);
    this.runs.delete(workflowId);
    return { status: "ready", data: true };
  }

  async listRuns(
    _workspaceId: string,
    workflowId: string,
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<WorkflowRun[]>> {
    void _workspaceId;
    void _signal;
    const list = this.runs.get(workflowId) ?? [];
    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(list)),
    };
  }

  async getRun(
    _workspaceId: string,
    workflowId: string,
    runId: string,
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<WorkflowRun>> {
    void _workspaceId;
    void _signal;
    const list = this.runs.get(workflowId) ?? [];
    const run = list.find((r) => r.id === runId);
    if (!run) {
      return { status: "not_found", message: `Run "${runId}" not found.` };
    }
    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(run)),
    };
  }
}

export const previewStore = new InMemoryPreviewStore();
