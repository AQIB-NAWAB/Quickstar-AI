import type { ServerResponse } from "node:http";
import type { Logger } from "@quickstart/logging";
import { sendError } from "../utils/http-response.js";

/** Log failure and return platform JSON error envelope. */
export function handleRequestError(
  res: ServerResponse,
  error: unknown,
  requestId: string,
  logger: Logger,
): void {
  logger.warn("request.failed", {
    request_id: requestId,
    error: error instanceof Error ? error.message : "unknown",
  });
  sendError(res, error, requestId);
}
