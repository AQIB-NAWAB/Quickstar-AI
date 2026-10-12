import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { WorkflowHttpContext } from "./context.js";
import { createWorkflowApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateWorkflowHttpServerOptions = WorkflowHttpContext & {
  logger: Logger;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

export function createHttpServer(options: CreateWorkflowHttpServerOptions): Application {
  const { logger } = options;
  const apiRouter = createWorkflowApiRouter(options);
  return createPlatformApp({
    logger,
    apiRouter,
    requestTimeoutMs: options.requestTimeoutMs ?? 30_000,
    globalRateLimit: {
      windowMs: options.rateLimitWindowMs ?? 60_000,
      max: options.rateLimitMax ?? 300,
      skipPaths: ["/healthz", "/health", "/readyz"],
    },
  });
}
