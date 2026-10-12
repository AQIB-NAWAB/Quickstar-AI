import { previewStore } from "./preview-store";
import type {
RepositoryResult,
WorkflowDefinition,
WorkflowListItem,
WorkflowRepository,
WorkflowRun,
} from "./types";

export function createProductionWorkflowRepository(): WorkflowRepository {
  const unavailableMsg = "Workflow automation is not available yet. This workspace's workflow engine is not connected.";

  return {
    async listWorkflows(_workspaceId: string): Promise<RepositoryResult<WorkflowListItem[]>> {
    void _workspaceId;
      return { status: "unavailable", message: unavailableMsg };
    },
    async getWorkflow(_workspaceId: string, _workflowId: string): Promise<RepositoryResult<WorkflowDefinition>> {
    void _workspaceId;
    void _workflowId;
      return { status: "unavailable", message: unavailableMsg };
    },
    async saveWorkflow(_workspaceId: string, _workflow: WorkflowDefinition): Promise<RepositoryResult<WorkflowDefinition>> {
    void _workspaceId;
    void _workflow;
      return { status: "unavailable", message: unavailableMsg };
    },
    async deleteWorkflow(_workspaceId: string, _workflowId: string): Promise<RepositoryResult<boolean>> {
    void _workspaceId;
    void _workflowId;
      return { status: "unavailable", message: unavailableMsg };
    },
    async listRuns(_workspaceId: string, _workflowId: string): Promise<RepositoryResult<WorkflowRun[]>> {
    void _workspaceId;
    void _workflowId;
      return { status: "unavailable", message: unavailableMsg };
    },
    async getRun(_workspaceId: string, _workflowId: string, _runId: string): Promise<RepositoryResult<WorkflowRun>> {
    void _workspaceId;
    void _workflowId;
    void _runId;
      return { status: "unavailable", message: unavailableMsg };
    },
  };
}

export function getWorkflowRepository(isDevelopmentPreview = false): WorkflowRepository {
  if (isDevelopmentPreview) {
    return previewStore;
  }
  return createProductionWorkflowRepository();
}
