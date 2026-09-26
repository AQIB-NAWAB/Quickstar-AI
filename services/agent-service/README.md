# Agent service

Workspace-scoped **agent configuration** (CRUD, optimistic concurrency) and **immutable versions** with a production pointer (publish / rollback).

See [ADR 0007](../../docs/adr/0007-agent-aggregate.md) and [ADR 0009](../../docs/adr/0009-agent-versioning.md).

## Prerequisites

- `make up` (Postgres, Valkey)
- `make workspace-migrate` (RBAC membership checks call workspace)
- Same `JWT_ACCESS_SECRET` as identity, workspace, and gateway

## Migrate

```bash
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart
make agent-migrate
```

Applies `001_agent_schema` and `002_agent_versions`.

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
# Create draft
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/agents" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Support","instructions":"Be helpful"}' | jq .

# Publish (base_version must match draft "version" from GET agent)
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/agents/$AGENT_ID/publish" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"base_version": 1}' | jq .

# Rollback production pointer
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/agents/$AGENT_ID/rollback" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d "{\"version_id\": \"$VERSION_ID\"}" | jq .

# Diff two releases
curl -s "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/agents/$AGENT_ID/versions/$V1/diff/$V2" \
  -H "authorization: Bearer $TOKEN" | jq .
```

Draft updates require `expected_version` matching the current `version` field on the agent JSON.

## Tests

```bash
pnpm --filter @quickstart/service-agent build
pnpm --filter @quickstart/service-agent test
```

Uses in-memory store and mocked workspace RBAC (no live workspace required).
