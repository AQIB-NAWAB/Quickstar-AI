import type { IncomingMessage } from "node:http";

type RequestWithBody = IncomingMessage & { body?: unknown };

/** Read JSON from Express-parsed body or raw stream (tests). */
export async function readJsonBody<T>(req: RequestWithBody): Promise<T> {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    return req.body as T;
  }
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
