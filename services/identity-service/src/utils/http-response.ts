import type { ServerResponse } from "node:http";

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}
