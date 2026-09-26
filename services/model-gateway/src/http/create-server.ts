import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { createInternalController } from "../controllers/internal.controller.js";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import { createRequireInternalTokenMiddleware } from "../middleware/require-internal-token.js";
import type { CompletionOrchestrator } from "../services/completion-orchestrator.js";
import type { DecisionService } from "../services/decision.service.js";
import type { ModelGatewayHttpContext } from "./context.js";
import { createModelGatewayApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateModelGatewayServerOptions = {
  logger: Logger;
  internalToken: string;
  orchestrator: CompletionOrchestrator;
  decisions: DecisionService;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  readinessProbes?: Array<() => Promise<void>>;
};

export function createModelGatewayServer(options: CreateModelGatewayServerOptions): Application {
  const httpContext: ModelGatewayHttpContext = {
    serviceName: SERVICE_NAME,
    internalAuth: createRequireInternalTokenMiddleware(options.internalToken),
    internalCtrl: createInternalController(options.orchestrator, options.decisions),
    readinessProbes: options.readinessProbes ?? [],
  };

  const apiRouter = createModelGatewayApiRouter(httpContext);

  return createPlatformApp({
    logger: options.logger,
    apiRouter,
    requestTimeoutMs: options.requestTimeoutMs,
    globalRateLimit: {
      windowMs: options.rateLimitWindowMs ?? 60_000,
      max: options.rateLimitMax ?? 120,
      skipPaths: ["/healthz", "/health", "/readyz"],
    },
  });
}
