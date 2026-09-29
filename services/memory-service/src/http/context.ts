import type { RequestHandler } from "@quickstart/http-server";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { FactsService } from "../services/facts.service.js";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";

export type MemoryHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  facts: FactsService;
};
