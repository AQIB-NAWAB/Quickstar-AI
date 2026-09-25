import type { RequestHandler } from "@quickstart/http-server";
import type { createAgentsStubController } from "../controllers/agents-stub.controller.js";
import type { createMembersController } from "../controllers/members.controller.js";
import type { createWorkspacesController } from "../controllers/workspaces.controller.js";
import type { AuthorizationService } from "../services/authorization.service.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";

export type WorkspaceHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  /** Auth + tenant validation; spread on each tenant-scoped route so params are available. */
  tenantMiddleware: RequestHandler[];
  authorization: AuthorizationService;
  workspacesCtrl: ReturnType<typeof createWorkspacesController>;
  membersCtrl: ReturnType<typeof createMembersController>;
  agentsStubCtrl: ReturnType<typeof createAgentsStubController>;
};
