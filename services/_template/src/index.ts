import { fileURLToPath } from "node:url";
import type { HealthResponse } from "@quickstart/contracts";
import { extractAuthContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { createLogger, type Logger } from "@quickstart/logging";
import {
  asyncHandler,
  createPlatformApp,
  requestIdFromResponse,
  sendPlatformJson,
  type Application,
} from "@quickstart/http-server";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { fetchWithPolicy } from "@quickstart/utilities";

export const SERVICE_NAME = "service-template";
const PORT = Number(process.env.PORT ?? 3000);

export type AppServerOptions = {
  logger?: Logger;
  port?: number;
};

function headerRecord(req: { headers: Record<string, string | string[] | undefined> }) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? (value[0] ?? "") : value;
  }
  return out;
}

export function createAppServer(options: AppServerOptions = {}): Application {
  const logger = options.logger ?? createLogger({ service: SERVICE_NAME });

  return createPlatformApp({
    logger,
    globalRateLimit: {
      windowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
      max: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 300),
      skipPaths: ["/healthz", "/health"],
    },
    requestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    registerRoutes: (router) => {
      router.get("/healthz", (_req, res) => {
        const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
        sendPlatformJson(res, 200, body);
      });
      router.get("/health", (_req, res) => {
        const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
        sendPlatformJson(res, 200, body);
      });

      router.get(
        "/demo/error",
        asyncHandler(async (req, res) => {
          const requestId = requestIdFromResponse(res);
          const auth = extractAuthContext(headerRecord(req));
          void auth?.tenantId;
          throw new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "Demo validation failure",
            requestId,
            details: { field: "example" },
          });
        }),
      );

      router.get(
        "/demo/outbound",
        asyncHandler(async (_req, res) => {
          const requestId = requestIdFromResponse(res);
          const port = Number(process.env.PORT ?? 3000);
          const response = await fetchWithPolicy(
            `http://127.0.0.1:${port}/healthz`,
            { method: "GET" },
            { timeoutMs: 2_000, maxRetries: 2 },
          );
          const payload = await response.json();
          sendPlatformJson(res, response.status, { request_id: requestId, upstream: payload });
        }),
      );
    },
  });
}

export async function startServer(options: AppServerOptions = {}) {
  await initTracing({ serviceName: SERVICE_NAME });
  const logger = options.logger ?? createLogger({ service: SERVICE_NAME });
  const app = createAppServer({ ...options, logger });
  const port = options.port ?? PORT;

  const server = await new Promise<ReturnType<Application["listen"]>>((resolve) => {
    const httpServer = app.listen(port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("listening", { port, service: SERVICE_NAME });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    await shutdownTracing();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  return app;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startServer();
}
