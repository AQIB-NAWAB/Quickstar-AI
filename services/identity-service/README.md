# Identity service (Slot 04)

Authentication, organizations, org membership, and org-scoped API keys.

Source layout: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Run locally

Schema is **not** applied on server startup. Run migrations first (see [database migrations](../../docs/architecture/database-migrations.md)).

```bash
make up   # Postgres + Valkey (both required)
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart
export REDIS_URL=redis://localhost:6379
make identity-migrate

export JWT_ACCESS_SECRET=dev-secret-min-32-chars-for-hs256!!
pnpm --filter @quickstart/service-identity build
pnpm --filter @quickstart/service-identity start
```

Identity **does not start** without Postgres (migrations) and Valkey/Redis (session revoke). Same rule locally and in production.

Default port: **3001** (`PORT` or `IDENTITY_PORT`).

- **`GET /readyz`** — Postgres + Valkey ping.
- **`GET /healthz`** — process liveness only.

## Smoke

```bash
curl -s -X POST http://127.0.0.1:3001/v1/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"Str0ng!pass","organization_name":"Acme"}' | jq .
```

See [ADR 0004](../../docs/adr/0004-identity.md).
