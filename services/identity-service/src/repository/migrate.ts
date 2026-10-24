import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const MIGRATIONS = [
  { version: "001_identity_schema", file: "001_identity_schema.sql" },
  { version: "002_password_resets", file: "002_password_resets.sql" },
];

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const here = dirname(fileURLToPath(import.meta.url));

  for (const migration of MIGRATIONS) {
    const { rows } = await pool.query<{ version: string }>(
      `SELECT version FROM schema_migrations WHERE version = $1`,
      [migration.version],
    );
    if (rows.length > 0) {
      continue;
    }

    const candidate1 = join(here, `../../migrations/${migration.file}`);
    const candidate2 = join(here, `../migrations/${migration.file}`);
    const sqlPath = existsSync(candidate1) ? candidate1 : candidate2;
    const sql = readFileSync(sqlPath, "utf8");

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
