import type { Logger } from "@quickstart/logging";
import { createPlatformApp, createRateLimitMiddleware, type Application } from "@quickstart/http-server";
import { requireAuthMiddleware } from "../middleware/index.js";
import type { IdentityServices } from "../services/index.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { IdentityHttpContext } from "./context.js";
import { createIdentityApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateHttpServerOptions = {
  logger: Logger;
  services: IdentityServices;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  authRateLimitMax?: number;
  readinessProbes?: ReadinessProbe[];
};

export function createHttpServer(options: CreateHttpServerOptions): Application {
  const { logger, services } = options;
  const authGuard = requireAuthMiddleware(services.auth);
  const authRateLimit = createRateLimitMiddleware({
    windowMs: options.rateLimitWindowMs ?? 60_000,
    max: options.authRateLimitMax ?? 20,
    message: "Too many authentication attempts",
  });

  const httpContext: IdentityHttpContext = {
    services,
    authGuard,
    authRateLimit,
    readinessProbes: options.readinessProbes ?? [],
  };

  const apiRouter = createIdentityApiRouter(httpContext);

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
