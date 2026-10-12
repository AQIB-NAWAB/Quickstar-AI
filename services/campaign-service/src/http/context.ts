import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { CampaignsService } from "../services/campaigns.service.js";

export type CampaignHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantGuard: RequestHandler;
  internalAuth: RequestHandler;
  workspaceAccess: WorkspaceAccessClient;
  campaigns: CampaignsService;
};
