import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

export function getRequestId(req: IncomingMessage): string {
  const incoming = req.headers["x-request-id"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && value.length > 0 ? value : randomUUID();
}

export function headerRecord(req: IncomingMessage): Record<string, string | string[] | undefined> {
  return req.headers as Record<string, string | string[] | undefined>;
}
