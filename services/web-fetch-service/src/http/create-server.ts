import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { createInternalController } from "../controllers/internal.controller.js";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import { createRequireInternalTokenMiddleware } from "../middleware/require-internal-token.js";
import type { JobRepository } from "../jobs/types.js";
import type { AcquisitionOrchestrator } from "../services/acquisition-orchestrator.js";
import type { WebFetchHttpContext } from "./context.js";
import { createWebFetchApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateWebFetchServerOptions = {
  logger: Logger;
  internalToken: string;
  orchestrator: AcquisitionOrchestrator;
  jobs: JobRepository;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  readinessProbes?: Array<() => Promise<void>>;
};

export function createWebFetchServer(options: CreateWebFetchServerOptions): Application {
  const httpContext: WebFetchHttpContext = {
    serviceName: SERVICE_NAME,
    internalAuth: createRequireInternalTokenMiddleware(options.internalToken),
    internalCtrl: createInternalController(options.orchestrator, options.jobs),
    readinessProbes: options.readinessProbes ?? [],
  };

  const apiRouter = createWebFetchApiRouter(httpContext);

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
