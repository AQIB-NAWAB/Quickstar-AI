import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantContext } from "../middleware/tenant.middleware.js";
import type { AuthorizationService } from "../services/authorization.service.js";
import type { MembersService } from "../services/members.service.js";
import type { WorkspacesService } from "../services/workspaces.service.js";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import { createWorkspacesController } from "../controllers/workspaces.controller.js";
import { createMembersController } from "../controllers/members.controller.js";
import { createAgentsStubController } from "../controllers/agents-stub.controller.js";
import type { WorkspaceHttpContext } from "./context.js";
import { createWorkspaceApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type WorkspaceServices = {
  workspaces: WorkspacesService;
  members: MembersService;
  authorization: AuthorizationService;
};

export type CreateWorkspaceHttpServerOptions = {
  logger: Logger;
  services: WorkspaceServices;
  jwtSecret: string;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  readinessProbes?: ReadinessProbe[];
};

export function createHttpServer(options: CreateWorkspaceHttpServerOptions): Application {
  const { logger, services, jwtSecret } = options;

  const authGuard = createAuthMiddleware(jwtSecret);
  const tenantGuard = requireTenantContext();

  const httpContext: WorkspaceHttpContext = {
    readinessProbes: options.readinessProbes ?? [],
    authGuard,
    tenantMiddleware: [authGuard, tenantGuard],
    authorization: services.authorization,
    workspacesCtrl: createWorkspacesController(services.workspaces),
    membersCtrl: createMembersController(services.members),
    agentsStubCtrl: createAgentsStubController(),
  };

  const apiRouter = createWorkspaceApiRouter(httpContext);

  return createPlatformApp({
    logger,
    apiRouter,
    requestTimeoutMs: options.requestTimeoutMs,
    globalRateLimit: {
      windowMs: options.rateLimitWindowMs ?? 60_000,
      max: options.rateLimitMax ?? 120,
      skipPaths: ["/healthz", "/health", "/readyz"],
    },
  });
}
