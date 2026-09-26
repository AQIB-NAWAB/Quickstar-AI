import { Pool } from "pg";
import { runConversationMigrations } from "./repository/migrate.js";

async function main(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await runConversationMigrations(pool);
    console.log("Conversation schema migrations completed successfully.");
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
