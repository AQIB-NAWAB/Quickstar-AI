import {
  deleteWorkflowApi,
  getRunApi,
  getWorkflowApi,
  listRunsApi,
  listWorkflowsApi,
  saveWorkflowApi,
} from "./client";
import { previewStore } from "./preview-store";
import type {
  RepositoryResult,
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRepository,
  WorkflowRun,
} from "./types";

export function createProductionWorkflowRepository(): WorkflowRepository {
  return {
    listWorkflows(workspaceId, signal) {
      return listWorkflowsApi(workspaceId, signal);
    },
    getWorkflow(workspaceId, workflowId, signal) {
      return getWorkflowApi(workspaceId, workflowId, signal);
    },
    saveWorkflow(workspaceId, workflow) {
      return saveWorkflowApi(workspaceId, workflow);
    },
    deleteWorkflow(workspaceId, workflowId) {
      return deleteWorkflowApi(workspaceId, workflowId);
    },
    listRuns(workspaceId, workflowId, signal) {
      return listRunsApi(workspaceId, workflowId, signal);
    },
    getRun(workspaceId, workflowId, runId, signal) {
      return getRunApi(workspaceId, workflowId, runId, signal);
    },
  };
}

export function getWorkflowRepository(isDevelopmentPreview = false): WorkflowRepository {
  if (isDevelopmentPreview) {
    return previewStore;
  }
  return createProductionWorkflowRepository();
}

export type { RepositoryResult, WorkflowDefinition, WorkflowListItem, WorkflowRun };
