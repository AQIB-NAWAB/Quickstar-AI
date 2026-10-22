import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const MIGRATIONS = [
  { version: "001_workspace_schema", file: "001_workspace_schema.sql" },
  { version: "002_publishable_keys", file: "002_publishable_keys.sql" },
  { version: "003_workspace_integrations", file: "003_workspace_integrations.sql" },
  { version: "004_workspace_notifications", file: "004_workspace_notifications.sql" },
  { version: "005_webhook_subscriptions_and_deliveries", file: "005_webhook_subscriptions_and_deliveries.sql" },
  { version: "006_integration_credentials_and_sync", file: "006_integration_credentials_and_sync.sql" },
  { version: "007_webhook_deliveries_queue", file: "007_webhook_deliveries_queue.sql" },
] as const;


export async function runWorkspaceMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = existsSync(join(here, "../../migrations"))
    ? join(here, "../../migrations")
    : join(here, "../migrations");

  for (const migration of MIGRATIONS) {
    const { rows } = await pool.query<{ version: string }>(
      `SELECT version FROM schema_migrations WHERE version = $1`,
      [migration.version],
    );
    if (rows.length > 0) {
      continue;
    }
    const sql = readFileSync(join(migrationsDir, migration.file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [migration.version]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
