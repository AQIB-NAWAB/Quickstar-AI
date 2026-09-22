import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

/** Use client `x-request-id` or generate one for logs and error envelopes. */
export function getRequestId(req: IncomingMessage): string {
  const incoming = req.headers["x-request-id"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && value.length > 0 ? value : randomUUID();
}
