import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

export function getRequestId(req: IncomingMessage): string {
  const incoming = req.headers["x-request-id"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && value.length > 0 ? value : randomUUID();
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}
