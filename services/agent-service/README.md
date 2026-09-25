# Agent service (Slot 07)

Workspace-scoped **agent configuration** (CRUD, optimistic concurrency). Not the LLM runtime or publish/versions (Slot 08).

See [ADR 0007](../../docs/adr/0007-agent-aggregate.md).

## Prerequisites

- `make up` (Postgres, Valkey)
- `make workspace-migrate` (RBAC membership checks call workspace)
- Same `JWT_ACCESS_SECRET` as identity, workspace, and gateway

## Migrate

```bash
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart
make agent-migrate
```

## Run (direct, debugging)

```bash
export JWT_ACCESS_SECRET=dev-only-change-me-min-32-characters-long!!
export REDIS_URL=redis://127.0.0.1:6379
export WORKSPACE_URL=http://127.0.0.1:3002
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart

pnpm --filter @quickstart/service-agent build
pnpm --filter @quickstart/service-agent start
```

Default port: **3003** (`AGENT_PORT`).

## Smoke via gateway

Start identity (3001), workspace (3002), agent (3003), gateway (3000). Then:

```bash
# After register + workspace create:
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/agents" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Support","instructions":"Be helpful"}' | jq .

curl -s "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/agents" \
  -H "authorization: Bearer $TOKEN" | jq .
```

Updates require `expected_version` matching the current `version` field in the agent JSON.

## Tests

```bash
pnpm --filter @quickstart/service-agent build
pnpm --filter @quickstart/service-agent test
```

Uses in-memory store and mocked workspace RBAC (no live workspace required).
