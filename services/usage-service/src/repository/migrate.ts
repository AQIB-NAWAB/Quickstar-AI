import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const MIGRATION_FILES = ["001_usage.sql", "002_analytics_rollups.sql"] as const;

export async function runUsageMigrations(pool: Pool): Promise<void> {
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await pool.query(sql);
  }
}
