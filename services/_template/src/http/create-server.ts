import { createLogger, type Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import type { TemplateHttpContext } from "./context.js";
import { createTemplateApiRouter } from "./routes/index.js";

export const SERVICE_NAME = "service-template";

export type AppServerOptions = {
  logger?: Logger;
  port?: number;
};

export function createAppServer(options: AppServerOptions = {}): Application {
  const logger = options.logger ?? createLogger({ service: SERVICE_NAME });
  const port = options.port ?? Number(process.env.PORT ?? 3000);

  const httpContext: TemplateHttpContext = {
    logger,
    serviceName: SERVICE_NAME,
    port,
  };

  const apiRouter = createTemplateApiRouter(httpContext);

  return createPlatformApp({
    logger,
    apiRouter,
    globalRateLimit: {
      windowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
      max: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 300),
      skipPaths: ["/healthz", "/health"],
    },
    requestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
  });
}
