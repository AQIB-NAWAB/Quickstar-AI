import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { createConversationsController } from "../controllers/conversations.controller.js";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { WorkspaceAccessClient } from "../lib/workspace-access-client.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { createRequireInternalTokenMiddleware } from "../middleware/require-internal-token.js";
import { requireTenantContext } from "../middleware/tenant.middleware.js";
import type { ConversationsService } from "../services/conversations.service.js";
import type { ConversationHttpContext } from "./context.js";
import { createConversationApiRouter } from "./routes/index.js";

import { createOperatorQueuesController } from "../controllers/operator-queues.controller.js";
import type { OperatorQueuesService } from "../services/operator-queues.service.js";

export { SERVICE_NAME };

export type CreateConversationHttpServerOptions = {
  logger: Logger;
  conversations: ConversationsService;
  operatorQueues?: OperatorQueuesService;
  jwtSecret: string;
  internalToken: string;
  workspaceAccess: WorkspaceAccessClient;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  readinessProbes?: ReadinessProbe[];
};

export function createHttpServer(options: CreateConversationHttpServerOptions): Application {
  const { logger, conversations, operatorQueues, jwtSecret, workspaceAccess } = options;

  const authGuard = createAuthMiddleware(jwtSecret);
  const tenantGuard = requireTenantContext();

  const httpContext: ConversationHttpContext = {
    readinessProbes: options.readinessProbes ?? [],
    authGuard,
    internalAuth: createRequireInternalTokenMiddleware(options.internalToken),
    tenantMiddleware: [authGuard, tenantGuard],
    workspaceAccess,
    conversationsCtrl: createConversationsController(conversations),
    operatorQueuesCtrl: operatorQueues ? createOperatorQueuesController(operatorQueues) : undefined,
  };

  const apiRouter = createConversationApiRouter(httpContext);

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
