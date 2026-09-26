# Conversation Service

Workspace-scoped durable **conversation threads and sequential messages** backed by PostgreSQL. Exposes endpoints exclusively through the API Gateway (`http://127.0.0.1:3000`).

See [ADR 0008](../../docs/adr/0008-conversation-and-idempotency.md).

## Local Port Architecture

| Service | Port | Description |
| --- | --- | --- |
| **Gateway** | **3000** | Single public ingress point for all client traffic (`GATEWAY_PORT`) |
| **Identity** | 3001 | Auth, user sessions, organization credentials (`IDENTITY_PORT`) |
| **Workspace** | 3002 | Workspaces, memberships, RBAC authorization (`WORKSPACE_PORT`) |
| **Agent** | 3003 | Agent configuration CRUD (`AGENT_PORT`) |
| **Conversation** | **3004** | Durable chat threads, message ordering, and idempotency (`CONVERSATION_PORT`) |

*Note: Ports 3001–3004 are internal service ports. Callers interact exclusively through Gateway port 3000.*

## High Volume Scope Notice

At high scale (millions of messages per day), append and cursor-based read (`after_seq`) are the hot paths.
**Table partitioning** (e.g. by workspace or month) and **cold storage archive jobs** are **not included yet** and will be introduced in subsequent scaling milestones.

## Prerequisites

- `make up` (Postgres on port 5433, Valkey/Redis on port 6379)
- `make workspace-migrate` (Workspace membership and RBAC tables)
- Shared `JWT_ACCESS_SECRET` configured across services

## Database Migrations

Apply the conversations and messages tables:

```bash
make conversation-migrate
```

Or manually:

```bash
DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart pnpm --filter @quickstart/service-conversation migrate
```

## Running Directly (Development & Debugging)

```bash
export JWT_ACCESS_SECRET=dev-only-change-me-min-32-characters-long!!
export REDIS_URL=redis://127.0.0.1:6379
export WORKSPACE_URL=http://127.0.0.1:3002
export DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart
export CONVERSATION_PORT=3004

pnpm --filter @quickstart/service-conversation build
pnpm --filter @quickstart/service-conversation start
```

## Public API Usage (via Gateway port 3000 only)

Ensure Identity (3001), Workspace (3002), Conversation (3004), and Gateway (3000) are running.

### 1. Create a Conversation

```bash
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/conversations" \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{}' | jq .
```

### 2. Append a Message (with Idempotency Key)

```bash
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/conversations/$CONVERSATION_ID/messages" \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "text": "Hello, how can I help you?",
    "idempotency_key": "user-msg-001",
    "sender_type": "user"
  }' | jq .
```

*Retrying this exact request with the same `idempotency_key` returns the existing message with HTTP `200 OK` and `"deduplicated": true` without incrementing `seq`.*

### 3. List Messages (with Sequence Cursor)

```bash
curl -s "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/conversations/$CONVERSATION_ID/messages?after_seq=0&limit=50" \
  -H "authorization: Bearer $TOKEN" | jq .
```

## Running Tests

```bash
pnpm --filter @quickstart/service-conversation build
pnpm --filter @quickstart/service-conversation test
```
