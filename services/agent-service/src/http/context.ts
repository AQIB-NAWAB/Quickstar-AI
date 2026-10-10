import type { RequestHandler } from "@quickstart/http-server";
import type { createAgentsController } from "../controllers/agents.controller.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { WorkspaceAccessClient } from "../lib/workspace-access-client.js";

export type AgentHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  internalAuth: RequestHandler;
  tenantMiddleware: RequestHandler[];
  workspaceAccess: WorkspaceAccessClient;
  agentsCtrl: ReturnType<typeof createAgentsController>;
};
