import type { IncomingMessage } from "node:http";
import type { Logger } from "@quickstart/logging";
import { getTraceIds, runWithSpan } from "@quickstart/tracing";
import { getRequestId } from "./request-id.middleware.js";

export type RequestContext = {
  requestId: string;
  method: string;
  url: string;
};

/** OpenTelemetry span + structured log for each HTTP request. */
export async function withRequestTracing(
  req: IncomingMessage,
  logger: Logger,
  handler: (context: RequestContext) => Promise<void>,
): Promise<void> {
  const requestId = getRequestId(req);
  const method = req.method ?? "GET";
  const url = req.url ?? "/";

  await runWithSpan(`${method} ${url}`, { requestId }, async () => {
    const traceIds = getTraceIds();
    logger.info("request.received", {
      request_id: requestId,
      method,
      path: url,
      trace_id: traceIds.traceId,
      span_id: traceIds.spanId,
    });
    await handler({ requestId, method, url });
  });
}
