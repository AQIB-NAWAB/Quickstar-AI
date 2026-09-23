import type { Logger } from "@quickstart/logging";
import { getTraceIds, runWithSpan } from "@quickstart/tracing";
import type { RequestHandler } from "express";
import { requestIdFromResponse } from "./request-id.js";

/** OpenTelemetry span for the full request (until response finishes). */
export function tracingMiddleware(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const method = req.method;
    const path = req.path;

    void runWithSpan(`${method} ${path}`, { requestId }, async () => {
      const traceIds = getTraceIds();
      logger.info("request.received", {
        request_id: requestId,
        method,
        path,
        trace_id: traceIds.traceId,
        span_id: traceIds.spanId,
      });

      await new Promise<void>((resolve, reject) => {
        res.once("finish", resolve);
        res.once("close", resolve);
        try {
          next();
        } catch (error) {
          reject(error);
        }
      });
    }).catch(next);
  };
}
