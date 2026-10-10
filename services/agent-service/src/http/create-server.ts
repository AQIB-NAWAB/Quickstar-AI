import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { createAgentsController } from "../controllers/agents.controller.js";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { WorkspaceAccessClient } from "../lib/workspace-access-client.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { createRequireInternalTokenMiddleware } from "../middleware/require-internal-token.js";
import { requireTenantContext } from "../middleware/tenant.middleware.js";
import type { AgentsService } from "../services/agents.service.js";
import type { AgentHttpContext } from "./context.js";
import { createAgentApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateAgentHttpServerOptions = {
  logger: Logger;
  agents: AgentsService;
  jwtSecret: string;
  internalToken: string;
  workspaceAccess: WorkspaceAccessClient;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  readinessProbes?: ReadinessProbe[];
};

export function createHttpServer(options: CreateAgentHttpServerOptions): Application {
  const { logger, agents, jwtSecret, workspaceAccess } = options;

  const authGuard = createAuthMiddleware(jwtSecret);
  const tenantGuard = requireTenantContext();

  const httpContext: AgentHttpContext = {
    readinessProbes: options.readinessProbes ?? [],
    authGuard,
    internalAuth: createRequireInternalTokenMiddleware(options.internalToken),
    tenantMiddleware: [authGuard, tenantGuard],
    workspaceAccess,
    agentsCtrl: createAgentsController(agents),
  };

  const apiRouter = createAgentApiRouter(httpContext);

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
