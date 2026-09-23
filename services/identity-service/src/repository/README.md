# Repository folder

**Repository** = code that talks to the **database** (Postgres). Services call the repository; they do not write SQL themselves.

| File / folder | Purpose                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `types.ts`    | Shapes of rows (user, org, …) and the **list of DB operations** services need (`IdentityStore`). |
| `entities/`   | TypeORM entity definitions (match SQL schema; `synchronize: false`).                             |
| `typeorm/`    | `DataSource` factory + `createTypeOrmIdentityStore` (production Postgres access).                |
| `memory.ts`   | Fake in-memory store for **unit tests** only (no Docker).                                        |
| `migrate.ts`  | Applies SQL files under `migrations/` once per database (not TypeORM synchronize).               |

**Migrate vs server:** Starting the HTTP server does **not** create tables. Run `pnpm migrate` (see `src/migrate.ts`) before `pnpm start`.
