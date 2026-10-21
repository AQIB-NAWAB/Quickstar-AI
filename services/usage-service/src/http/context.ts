import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { AnalyticsService } from "../services/analytics.service.js";
import type { UsageService } from "../services/usage.service.js";

export type UsageHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  usage: UsageService;
  analytics: AnalyticsService;
};
