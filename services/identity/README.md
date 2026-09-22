# Identity service (Slot 04)

Authentication, organizations, org membership, and org-scoped API keys.

## Run locally

```bash
make up   # Postgres + Valkey
export JWT_ACCESS_SECRET=dev-secret-min-32-chars-for-hs256!!
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5432/quickstart
export REDIS_URL=redis://localhost:6379
pnpm --filter @quickstart/service-identity build
pnpm --filter @quickstart/service-identity start
```

Default port: **3001** (`PORT` or `IDENTITY_PORT`).

## Smoke

```bash
curl -s -X POST http://127.0.0.1:3001/v1/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"Str0ng!pass","organization_name":"Acme"}' | jq .
```

See [ADR 0004](../../docs/adr/0004-identity.md).
