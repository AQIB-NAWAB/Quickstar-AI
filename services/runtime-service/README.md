# Runtime Service (`@quickstart/service-runtime`)

Core agent turn execution engine connecting published agent version snapshots, conversation history storage, and the internal model gateway. Exposes turn endpoints exclusively through the API Gateway (`http://127.0.0.1:3000`).

See [Roadmap §14](../../docs/roadmap.md).

## Local Port Architecture

| Service | Port | Description |
| --- | --- | --- |
| **Gateway** | **3000** | Single public ingress point for all client traffic (`GATEWAY_PORT`) |
| **Identity** | 3001 | Auth, user sessions, organization credentials (`IDENTITY_PORT`) |
| **Workspace** | 3002 | Workspaces, memberships, RBAC authorization (`WORKSPACE_PORT`) |
| **Agent** | 3003 | Agent configuration CRUD and immutable versions (`AGENT_PORT`) |
| **Conversation** | 3004 | Durable chat threads, message ordering, and idempotency (`CONVERSATION_PORT`) |
| **Model Gateway** | 3005 | Internal LLM edge and multi-provider drivers (`MODEL_GATEWAY_PORT`) |
| **Runtime** | **3006** | Agent turn execution, snapshot binding, and reply generation (`RUNTIME_PORT`) |

*Note: Ports 3001–3006 are internal microservice ports. External clients interact exclusively through Gateway port 3000.*

## Core Responsibilities

1. **Production Pointer Only:** Checks the agent's published version (`production_version_id`). If an agent is in draft status or has no published release, rejects with **409 Conflict** (`AGENT_NOT_PUBLISHED`).
2. **Tenant Scoping & IDOR Guard:** All queries are strictly scoped by `workspace_id`. Cross-workspace conversation attempts fail closed with **404 Not Found**.
3. **Turn Atomicity & Storage:** Appends user message and assistant reply to `conversation-service` (port 3004), permanently recording `agent_version_id` on the assistant message.
4. **Idempotency Deduplication:** Replaying a turn with an identical `Idempotency-Key` returns the cached assistant reply with **200 OK** and `deduplicated: true` without invoking the model gateway a second time.
5. **Model Gateway Integration:** Invokes `model-gateway` (port 3005) with timeout and circuit-breaker protection.

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `RUNTIME_PORT` / `PORT` | `3006` | Local HTTP listen port |
| `AGENT_SERVICE_URL` | `http://127.0.0.1:3003` | URL for agent configuration & version snapshots |
| `CONVERSATION_SERVICE_URL` | `http://127.0.0.1:3004` | URL for durable conversation history |
| `MODEL_GATEWAY_URL` | `http://127.0.0.1:3005` | URL for internal LLM model gateway |
| `MODEL_GATEWAY_INTERNAL_TOKEN` | `local-dev-token-at-least-32-characters-long` | Internal Bearer token for model gateway auth |
| `JWT_ACCESS_SECRET` | *required in prod* | Secret to verify JWT tokens if called directly |
| `HTTP_REQUEST_TIMEOUT_MS` | `30000` | Upstream timeout guard |

## Running Directly (Development)

```bash
export JWT_ACCESS_SECRET=dev-only-change-me-min-32-characters-long!!
export AGENT_SERVICE_URL=http://127.0.0.1:3003
export CONVERSATION_SERVICE_URL=http://127.0.0.1:3004
export MODEL_GATEWAY_URL=http://127.0.0.1:3005
export RUNTIME_PORT=3006

pnpm --filter @quickstart/service-runtime build
pnpm --filter @quickstart/service-runtime start
```

## Running Automated Tests

```bash
pnpm --filter @quickstart/service-runtime test
```

## Public API Usage (via Gateway port 3000)

```bash
# Execute a turn
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/${WORKSPACE_ID}/conversations/${CONVERSATION_ID}/turns" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"message": "Hello agent! How can you help me today?"}'
```
