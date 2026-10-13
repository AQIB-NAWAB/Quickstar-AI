import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createLogger } from "@quickstart/logging";
import { initTracing, shutdownTracing } from "@quickstart/tracing";
import { createHttpWorkspaceAccessClient } from "@quickstart/workspace-access";
import { loadConfig } from "./config.js";
import { Store } from "./store.js";
import { createServer } from "./http.js";
import { ResearchAgent, GatewayResearchProvider, DemoProvider } from "./research.js";
import { startWorker } from "./worker.js";

export async function main() {
  const config = loadConfig();
  const logger = createLogger({ service: "lead-generation" });
  await initTracing({ serviceName: "lead-generation" });
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 15000,
    options: "-c timezone=UTC",
  });
  pool.on("error", () => logger.error("lead.database.connection_failed", {}));
  const store = new Store(pool, config.live ? "live" : "demo");
  try {
    await store.initialize();
  } catch (error) {
    await pool.end();
    await shutdownTracing();
    throw error;
  }
  const access = createHttpWorkspaceAccessClient(config.workspaceUrl, 5000);
  const app = createServer(config, store, access, logger);
  const provider = config.live ? new GatewayResearchProvider(config, store) : new DemoProvider();
  const worker = config.workersEnabled
    ? startWorker(store, new ResearchAgent(store, provider, config), config, logger)
    : null;
  const server = app.listen(config.port, config.host, () =>
    logger.info("listening", { port: config.port, mode: config.live ? "live" : "demo" }),
  );
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await worker?.stop();
    await pool.end();
    await shutdownTracing();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
  return { server, shutdown };
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  void main().catch(() => {
    console.error("Lead service startup failed. Check configuration, migrations and dependencies.");
    process.exitCode = 1;
  });
