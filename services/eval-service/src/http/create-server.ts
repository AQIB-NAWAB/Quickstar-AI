import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { EvalHttpContext } from "./context.js";
import { createEvalApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateEvalHttpServerOptions = EvalHttpContext & {
  logger: Logger;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

export function createHttpServer(options: CreateEvalHttpServerOptions): Application {
  const { logger } = options;
  const apiRouter = createEvalApiRouter(options);
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
