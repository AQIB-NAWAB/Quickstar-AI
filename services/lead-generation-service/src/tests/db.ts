import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { Store } from "../store.js";
import { migrate } from "../migrate.js";

/** Defaults to embedded PostgreSQL. TEST_DATABASE_URL runs the same suite against an external DB. */
export async function database() {
  if (process.env.TEST_DATABASE_URL) {
    const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const schema = `lg_test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${schema} -c timezone=UTC`,
    });
    await migrate(pool);
    const store = new Store(pool, "demo");
    await store.initialize();
    return {
      store,
      pool,
      async close() {
        await pool.end();
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        await admin.end();
      },
    };
  }
  const db = new PGlite();
  let tail: Promise<void> = Promise.resolve();
  async function acquire() {
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    const prior = tail;
    tail = next;
    await prior;
    return release;
  }
  async function query(sql: string, values: unknown[] = []) {
    // pg sends JS objects as JSON parameters; emulate that conversion exactly.
    const args = values.map((v) =>
      v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)
        ? JSON.stringify(v)
        : v,
    );
    // PGlite's prepared query accepts a single statement; migration files use exec.
    if (!args.length && sql.split(";").filter((s) => s.trim()).length > 1) {
      await db.exec(sql);
      return { rows: [], rowCount: 0 };
    }
    const r = await db.query(sql, args);
    return { rows: r.rows, rowCount: r.affectedRows ?? 0 };
  }
  const pool = {
    async query(sql: string, values?: unknown[]) {
      const unlock = await acquire();
      try {
        return await query(sql, values);
      } finally {
        unlock();
      }
    },
    async connect() {
      const unlock = await acquire();
      return { query, release: unlock };
    },
  } as unknown as Pool;
  await migrate(pool);
  await migrate(pool);
  const store = new Store(pool, "demo");
  await store.initialize();
  return {
    store,
    pool,
    async close() {
      await db.close();
    },
  };
}
