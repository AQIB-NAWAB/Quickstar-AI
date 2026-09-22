import type { ServerResponse } from "node:http";
import { httpStatusForError, toErrorEnvelope } from "@quickstart/errors";

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function sendError(res: ServerResponse, error: unknown, requestId: string): void {
  sendJson(res, httpStatusForError(error), toErrorEnvelope(error, requestId));
}

export function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}
