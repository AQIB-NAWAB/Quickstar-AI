import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import type { HealthResponse } from "@quickstart/contracts";

const SERVICE_NAME = "service-template";
const PORT = Number(process.env.PORT ?? 3000);

export function createAppServer() {
  return createServer((req, res) => {
    if (req.method === "GET" && (req.url === "/healthz" || req.url === "/health")) {
      const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}

export function startServer() {
  const server = createAppServer();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(
      JSON.stringify({ level: "info", msg: "listening", port: PORT, service: SERVICE_NAME }),
    );
  });
  return server;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  startServer();
}
