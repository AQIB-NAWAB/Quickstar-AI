import { Pool } from "pg";
import { runMigrations } from "../repository/migration-runner.js";

async function main(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5432/quickstart";

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await runMigrations(pool);
    console.log("Identity migrations: up to date.");
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
