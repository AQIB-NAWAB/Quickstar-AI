import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { AuditHttpContext } from "./context.js";
import { createAuditApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateAuditHttpServerOptions = AuditHttpContext & {
  logger: Logger;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

export function createHttpServer(options: CreateAuditHttpServerOptions): Application {
  const { logger } = options;
  const apiRouter = createAuditApiRouter(options);
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
