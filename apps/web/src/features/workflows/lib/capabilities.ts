import type { ActionKind } from "./types";

export interface WorkflowCapabilities {
  canRead: boolean;
  canEdit: boolean;
  canActivate: boolean;
  canPause: boolean;
  canDelete: boolean;
  canReadRuns: boolean;
  isPersistenceConnected: boolean;
  supportedActions: ActionKind[];
}

export const PRODUCTION_WORKFLOW_CAPABILITIES: WorkflowCapabilities = {
  canRead: false,
  canEdit: false,
  canActivate: false,
  canPause: false,
  canDelete: false,
  canReadRuns: false,
  isPersistenceConnected: false,
  supportedActions: [],
};

export const PREVIEW_WORKFLOW_CAPABILITIES: WorkflowCapabilities = {
  canRead: true,
  canEdit: true,
  canActivate: false, // Explicitly false in preview per instructions
  canPause: false,
  canDelete: true,
  canReadRuns: true,
  isPersistenceConnected: true,
  supportedActions: ["webhook", "update_tags", "email_notification", "agent_handoff"],
};
