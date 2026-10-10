import type { Pool } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runSecretsMigrations(pool: Pool): Promise<void> {
  const sql = readFileSync(
    join(__dirname, "../../migrations/001_secrets.sql"),
    "utf-8",
  );
  await pool.query(sql);
}
