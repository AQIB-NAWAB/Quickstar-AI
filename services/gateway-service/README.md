# API gateway (Slot 06)

Public HTTP entry for QuickStart. Proxies to identity and workspace services.

See [ADR 0006](../../docs/adr/0006-api-gateway.md) and [docs/api](../../docs/api/README.md).

## Prerequisites

- Data plane: `make up`
- Migrations: `make identity-migrate` and `make workspace-migrate`
- Identity on **3001**, workspace on **3002**, agent on **3003**
- Same `JWT_ACCESS_SECRET` for all four (including gateway)

## Run

```bash
export JWT_ACCESS_SECRET=dev-only-change-me-min-32-characters-long!!
export REDIS_URL=redis://127.0.0.1:6379
export IDENTITY_URL=http://127.0.0.1:3001
export WORKSPACE_URL=http://127.0.0.1:3002
export AGENT_URL=http://127.0.0.1:3003

pnpm --filter @quickstart/service-gateway build
pnpm --filter @quickstart/service-gateway start
```

Default gateway port: **3000** (`GATEWAY_PORT` or `PORT`).

## Manual smoke (through gateway)

See [TESTING.md](./TESTING.md).
