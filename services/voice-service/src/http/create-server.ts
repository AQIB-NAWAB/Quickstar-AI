import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { SERVICE_NAME } from "../controllers/health.controller.js";
import type { VoiceHttpContext } from "./context.js";
import { createVoiceApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateVoiceHttpServerOptions = VoiceHttpContext & {
  logger: Logger;
  requestTimeoutMs?: number;
};

export function createHttpServer(options: CreateVoiceHttpServerOptions): Application {
  const { logger } = options;
  const apiRouter = createVoiceApiRouter(options);
  return createPlatformApp({
    logger,
    apiRouter,
    requestTimeoutMs: options.requestTimeoutMs ?? 30_000,
    globalRateLimit: {
      windowMs: 60_000,
      max: 600,
      skipPaths: ["/healthz", "/health", "/readyz"],
    },
  });
}
