import type { RequestHandler } from "@quickstart/http-server";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { SecretsService } from "../services/secrets.service.js";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";

export type SecretsHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  secrets: SecretsService;
};
