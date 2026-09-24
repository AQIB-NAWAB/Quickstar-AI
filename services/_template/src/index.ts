import { fileURLToPath } from "node:url";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import type { Application } from "@quickstart/http-server";
import { createAppServer, SERVICE_NAME } from "./http/create-server.js";

const PORT = Number(process.env.PORT ?? 3000);

export { SERVICE_NAME, createAppServer } from "./http/create-server.js";

export async function startServer(
  options: { logger?: ReturnType<typeof createLogger>; port?: number } = {},
): Promise<Application> {
  await initTracing({ serviceName: SERVICE_NAME });
  const logger = options.logger ?? createLogger({ service: SERVICE_NAME });
  const app = createAppServer({ ...options, logger });
  const port = options.port ?? PORT;

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const httpServer = app.listen(port, "0.0.0.0", () => resolve(httpServer));
  });

  logger.info("listening", { port, service: SERVICE_NAME });

  const shutdown = async () => {
    logger.info("shutdown", { service: SERVICE_NAME });
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
    await shutdownTracing();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  return app;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void startServer();
}
