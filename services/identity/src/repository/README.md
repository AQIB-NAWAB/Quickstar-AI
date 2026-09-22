# Repository folder

**Repository** = code that talks to the **database** (Postgres). Services call the repository; they do not write SQL themselves.

| File          | Purpose                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `types.ts`    | Shapes of rows (user, org, …) and the **list of DB operations** services need (`IdentityRepository`). |
| `postgres.ts` | Real Postgres implementation (production + local Docker).                                             |
| `memory.ts`   | Fake in-memory DB for **unit tests** only (no Docker).                                                |
| `migrate.ts`  | Applies SQL files under `migrations/` once per database.                                              |

**Migrate vs server:** Starting the HTTP server does **not** create tables. Run `pnpm migrate` (see `src/migrate.ts`) before `pnpm start`.
