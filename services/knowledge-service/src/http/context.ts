import type { RequestHandler } from "@quickstart/http-server";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { SourcesService } from "../services/sources.service.js";
import type { RetrieveService } from "../services/retrieve.service.js";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";

export type KnowledgeHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  sources: SourcesService;
  retrieve: RetrieveService;
};
