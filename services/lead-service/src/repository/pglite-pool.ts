/**
 * Minimal pg.Pool-compatible adapter over @electric-sql/pglite for local LLD tests
 * when Docker/Postgres is unavailable.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

type QueryResult<T> = { rows: T[]; rowCount: number };

type PgliteLike = {
  waitReady: Promise<unknown>;
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; affectedRows?: number }>;
  exec: (sql: string) => Promise<unknown>;
  close: () => Promise<void>;
};

async function loadPgliteCtor(): Promise<new () => PgliteLike> {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/repository → repo root is ../../../../ ; src/repository likewise after build.
  const repoRoot = join(here, "../../../..");
  const candidates = [
    "@electric-sql/pglite",
    pathToFileURL(
      join(
        repoRoot,
        "node_modules/.pnpm/@electric-sql+pglite@0.3.16/node_modules/@electric-sql/pglite/dist/index.js",
      ),
    ).href,
    pathToFileURL(
      join(process.cwd(), "node_modules/.pnpm/@electric-sql+pglite@0.3.16/node_modules/@electric-sql/pglite/dist/index.js"),
    ).href,
  ];
  const errors: string[] = [];
  for (const id of candidates) {
    try {
      const mod = (await import(id)) as { PGlite: new () => PgliteLike };
      if (mod?.PGlite) return mod.PGlite;
    } catch (err) {
      errors.push(`${id}: ${(err as Error).message}`);
    }
  }
  throw new Error(`PGlite not available (${errors.join("; ")})`);
}

export class PglitePool {
  private db: PgliteLike | null = null;

  async init(): Promise<this> {
    const PGlite = await loadPgliteCtor();
    this.db = new PGlite();
    await this.db.waitReady;
    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
    for (const file of ["001_leads.sql", "002_lead_schema.sql"] as const) {
      const sql = readFileSync(join(migrationsDir, file), "utf8").replace(
        /CREATE EXTENSION[^;]+;/gi,
        "",
      );
      await this.db.exec(sql);
    }
    return this;
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    if (!this.db) throw new Error("PglitePool not initialized");
    const result = await this.db.query<T>(text, params ?? []);
    return { rows: result.rows ?? [], rowCount: result.affectedRows ?? result.rows?.length ?? 0 };
  }

  async end(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
