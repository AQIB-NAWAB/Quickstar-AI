import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import type { HealthResponse } from "@quickstart/contracts";
import { extractAuthContext } from "@quickstart/auth";
import { AppError, ErrorCode, httpStatusForError, toErrorEnvelope } from "@quickstart/errors";
import { createLogger, type Logger } from "@quickstart/logging";
import { getTraceIds, initTracing, runWithSpan, shutdownTracing } from "@quickstart/tracing";
import { fetchWithPolicy } from "@quickstart/utilities";
import { getRequestId, headerRecord } from "./http-utils.js";

export const SERVICE_NAME = "service-template";
const PORT = Number(process.env.PORT ?? 3000);

export type AppServerOptions = {
  logger?: Logger;
  port?: number;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, error: unknown, requestId: string): void {
  const status = httpStatusForError(error);
  sendJson(res, status, toErrorEnvelope(error, requestId));
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  logger: Logger,
): Promise<void> {
  const requestId = getRequestId(req);
  const auth = extractAuthContext(headerRecord(req));
  const tenantId = auth?.tenantId;

  await runWithSpan(
    `${req.method ?? "GET"} ${req.url ?? "/"}`,
    { requestId, tenantId },
    async () => {
      const traceIds = getTraceIds();
      logger.info("request.received", {
        request_id: requestId,
        method: req.method,
        path: req.url,
        trace_id: traceIds.traceId,
        span_id: traceIds.spanId,
        tenant_id: tenantId,
      });

      try {
        if (req.method === "GET" && (req.url === "/healthz" || req.url === "/health")) {
          const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
          sendJson(res, 200, body);
          return;
        }

        if (req.method === "GET" && req.url === "/demo/error") {
          throw new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "Demo validation failure",
            requestId,
            details: { field: "example" },
          });
        }

        if (req.method === "GET" && req.url === "/demo/outbound") {
          const port = Number(process.env.PORT ?? 3000);
          const response = await fetchWithPolicy(
            `http://127.0.0.1:${port}/healthz`,
            { method: "GET" },
            { timeoutMs: 2_000, maxRetries: 2 },
          );
          const payload = await response.json();
          sendJson(res, response.status, { request_id: requestId, upstream: payload });
          return;
        }

        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Route not found",
          requestId,
        });
      } catch (error) {
        logger.warn("request.failed", {
          request_id: requestId,
          error: error instanceof Error ? error.message : "unknown",
        });
        sendError(res, error, requestId);
      }
    },
  );
}

export function createAppServer(options: AppServerOptions = {}) {
  const logger = options.logger ?? createLogger({ service: SERVICE_NAME });

  return createServer((req, res) => {
    void handleRequest(req, res, logger);
  });
}

export async function startServer(options: AppServerOptions = {}) {
  await initTracing({ serviceName: SERVICE_NAME });
  const logger = options.logger ?? createLogger({ service: SERVICE_NAME });
  const server = createAppServer({ ...options, logger });
  const port = options.port ?? PORT;

  await new Promise<void>((resolve) => {
    server.listen(port, "0.0.0.0", () => resolve());
  });

  logger.info("listening", { port, service: SERVICE_NAME });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await shutdownTracing();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  return server;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startServer();
}
