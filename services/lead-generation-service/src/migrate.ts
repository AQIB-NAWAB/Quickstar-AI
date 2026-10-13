import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

export const migrationSql = () =>
  readFileSync(new URL("../migrations/001_lead_generation.sql", import.meta.url), "utf8");
export async function migrate(pool: Pool) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(3019)");
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const version = "001_lead_generation";
    if (
      !(await c.query("SELECT 1 FROM schema_migrations WHERE version=$1", [version])).rows.length
    ) {
      await c.query(migrationSql());
      await c.query("INSERT INTO schema_migrations(version) VALUES($1)", [version]);
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
  });
  void migrate(pool)
    .then(() => console.log("Lead generation migrations complete."))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
