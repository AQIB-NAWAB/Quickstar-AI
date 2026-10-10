import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const MIGRATIONS = [
  { version: "001_conversation_schema", file: "001_conversation_schema.sql" },
  { version: "002_message_metadata", file: "002_message_metadata.sql" },
  { version: "003_conversation_subject_key", file: "003_conversation_subject_key.sql" },
  { version: "004_tool_calls", file: "004_tool_calls.sql" },
  { version: "005_conversation_handoff", file: "005_conversation_handoff.sql" },
] as const;

export async function runConversationMigrations(pool: Pool): Promise<void> {
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
