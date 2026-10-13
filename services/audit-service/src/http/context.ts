import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { AuditService } from "../services/audit.service.js";

export type AuditHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  audit: AuditService;
};
