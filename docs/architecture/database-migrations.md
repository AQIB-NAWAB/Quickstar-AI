# Database migrations

How and why we change Postgres schema for services such as **Identity** — without hiding it inside app startup.

## Why migrations exist

The Identity service stores **durable data**: users, password hashes, organizations, refresh tokens, API keys. That data lives in **PostgreSQL**, not in the Node process.

**Migrations** are versioned SQL files that change the database **structure** (tables, indexes, constraints). They answer:

- What tables does this service need?
- How do we upgrade from version A to B without losing data?

Without migrations, every developer would run ad‑hoc SQL by hand. Production and local would drift, and deploys would break.

## What a migration affects

| Affected                                                            | Not affected                                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Schema** — `CREATE TABLE`, indexes, constraints                   | Application code in other services                                                                                     |
| **Empty new databases** — first migrate creates all identity tables | Redis (sessions) — separate from SQL migrations                                                                        |
| **Future deploys** — new migration files add columns/tables         | Existing row **data** — migrations should be written to preserve data when upgrading (Slot 04 has only initial schema) |

Running Identity migrations on your local Postgres (Compose) creates tables in the **`quickstart`** database. Other services will use their own migration tracks later; table names are owned by Identity for now (`users`, `organizations`, …).

**If migration never ran:** Identity `start` will connect to Postgres but **register/login will fail** (missing tables).

**If migration already ran:** Running migrate again is **safe** — we record `001_identity_schema` in `schema_migrations` and skip re-applying.

## Production practice (what we do instead of auto-migrate)

We **do not** apply schema changes when the HTTP server boots.

Reasons (staff-level):

1. **Many replicas** — several pods starting at once must not race to run DDL.
2. **Control** — schema change is a deliberate step, reviewed like code, often before new app version traffic.
3. **Rollback** — app rollback is separate from schema rollback; you need a clear migrate step in CI/CD.
4. **Permissions** — production app user often has **no DDL** rights; a migrate job uses a narrower admin role.

Typical flow:

```text
1. Merge migration SQL in git
2. CI runs migrate against staging DB (one job)
3. Deploy new Identity pods (IDENTITY does not migrate on start)
4. Production migrate job (or pipeline stage) before or with deploy
```

Local dev matches that idea: **you run migrate once** (or after pulling new SQL), then **start** the service.

## Identity migrations in this repo

| Item   | Location                                                                            |
| ------ | ----------------------------------------------------------------------------------- |
| SQL    | `services/identity/migrations/001_identity_schema.sql`                              |
| Runner | `services/identity/src/repository/migrate.ts` (logic), `src/migrate.ts` (CLI entry) |
| CLI    | `pnpm --filter @quickstart/service-identity migrate`                                |
| Make   | `make identity-migrate` (from repo root)                                            |

Requires **`DATABASE_URL`** (see [`.env.example`](../../.env.example)).

### Local workflow

```bash
make up
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5432/quickstart
make identity-migrate
export JWT_ACCESS_SECRET=dev-only-change-me-min-32-characters-long!!
pnpm --filter @quickstart/service-identity build
pnpm --filter @quickstart/service-identity start
```

### Manual SQL (optional)

Same as migrate CLI, but explicit:

```bash
docker compose exec -T postgres psql -U quickstart -d quickstart \
  < services/identity/migrations/001_identity_schema.sql
```

Prefer the CLI so `schema_migrations` stays in sync.

## Later improvements

- Dedicated tool (e.g. **golang-migrate**, **Flyway**, **Atlas**) when multiple services and environments grow.
- One migrate **Job** in Kubernetes / Render pre-deploy hook.
- Separate DB roles: `identity_migrator` vs `identity_app`.

## References

- [ADR 0004: Identity](../adr/0004-identity.md)
- [Local data plane](./local-data-plane.md)
