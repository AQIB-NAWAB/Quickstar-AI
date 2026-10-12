import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { WorkflowsService } from "../services/workflows.service.js";

export type WorkflowHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  workflows: WorkflowsService;
};
