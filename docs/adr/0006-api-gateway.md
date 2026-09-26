# ADR 0006: API gateway (BFF)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Slot:** 06 — API gateway / BFF

## Context

Identity (`:3001`) and workspace (`:3002`) services run as separate HTTP processes. Browsers and external SDKs must not call each service directly: CORS, auth, and tenant handling would multiply and leak. Slot 05 established workspace RBAC and `TenantContext`; the gateway is the **public door** that validates access tokens and forwards traffic.

Design targets (`project_details.md` §5): **10,000 RPS sustained**, **20,000 RPS peak** hit the edge first. Voice adds **5,000 concurrent inbound calls** and **5,000 concurrent outbound calls** (`project_details.md` §7). The gateway must stay **stateless**; rate-limit counters live in **Redis/Valkey**, not process memory.

## Decision

### One application gateway service

We deploy **`services/gateway-service`** as a thin **BFF**:

- Terminates external HTTP on `0.0.0.0:$PORT` (Render/Kubernetes later).
- Validates **Bearer JWT** (HS256, same `JWT_ACCESS_SECRET` as identity) on protected routes.
- Applies **Redis-backed** rate limits at the edge.
- **Proxies** to internal upstreams; does not run workspace or identity business logic.
- Returns **401 / 403 / 429** using `@quickstart/errors` envelope and `request_id`.

We **reject** browser-direct calls to identity/workspace in production (network policy + documentation). Local dev may still curl upstream ports for debugging.

We **reject** using AWS API Gateway **instead of** this BFF for product routing in Slot 06. In Slot 29, **CloudFront/WAF/ALB** may sit **in front of** this service; the Node BFF remains the place for product auth context and route map.

### Route map (external path → upstream)

| External path | Upstream | Auth at gateway |
| ------------- | -------- | ----------------- |
| `POST /v1/register` | Identity | Public |
| `POST /v1/login` | Identity | Public |
| `POST /v1/refresh` | Identity | Public |
| `POST /v1/logout` | Identity | Public |
| `GET /v1/me` | Identity | Bearer required |
| `GET /v1/organizations` | Identity | Bearer required |
| `GET /v1/organizations/:orgId` | Identity | Bearer required |
| `POST/GET/DELETE /v1/organizations/:orgId/api-keys…` | Identity | Bearer required |
| `POST/GET /v1/orgs/:orgId/workspaces` | Workspace | Bearer required |
| `/v1/workspaces/:workspaceId…` (members, invites, agents stub) | Workspace | Bearer required |
| `GET /healthz`, `GET /health` | Gateway (local) | Public |

Identity and workspace **keep** their own health/ready endpoints on internal ports for orchestration.

### Downstream trust

On protected routes, after JWT verification, the gateway sets:

- `Authorization: Bearer <same token>` (workspace/identity still accept Bearer today).
- `x-quickstart-auth-context` — base64url JSON (`actor_id`, `tenant_id` = JWT `org_id` until workspace-scoped claims exist, `roles: []`, `request_id`).

Workspace **still** enforces `requirePermission` and `TenantContext` from URL `workspaceId`. The gateway does **not** replace fine-grained RBAC.

### Middleware order (gateway process)

```text
request_id → tracing → timeout → JSON body → Redis rate limit → routes → 404 → errors
```

Per-route: **JWT guard** on protected proxies only (after global limit).

### Rate limiting

- Store: **Redis**, key prefix `gateway:rl:` + client IP (and later API key id).
- Exceed budget → **429** `RATE_LIMITED` with envelope.
- **If Redis is unavailable at startup:** gateway **refuses to start** (same posture as identity session Redis).
- **If Redis fails during a limit check:** treat as **503** `UPSTREAM_UNAVAILABLE` (fail closed on abuse control).

Service-level limits on identity/workspace remain as **defense in depth** when the gateway is bypassed in dev.

### Upstream failures

- Upstream timeout → **504** `UPSTREAM_TIMEOUT` with `request_id`.
- Connection errors → **503** `UPSTREAM_UNAVAILABLE`.
- Do not hang until the load balancer kills the connection.

### Configuration

| Variable | Purpose |
| -------- | ------- |
| `PORT` / `GATEWAY_PORT` | Listen port (default **3000**) |
| `IDENTITY_URL` | e.g. `http://127.0.0.1:3001` |
| `WORKSPACE_URL` | e.g. `http://127.0.0.1:3002` |
| `JWT_ACCESS_SECRET` | Shared with identity |
| `REDIS_URL` | Rate limit store |
| `HTTP_REQUEST_TIMEOUT_MS` | Gateway → upstream timeout |
| `HTTP_RATE_LIMIT_*` | Window and max for edge |

### Non-goals (Slot 06)

- AWS API Gateway / ALB as the **application** router (Slot 29 infra only).
- GraphQL or gRPC public API.
- Agent, conversation, or runtime routes (later slots).
- API key validation at gateway (org API keys — extend in a later slot; JWT only for now).

## Consequences

- External clients integrate with **one base URL**.
- Identity and workspace can stay on private network paths in cloud.
- Two gateway replicas share one Redis limit budget (correct); in-memory limits would not.
- **Still unsafe at 5k burst:** single IP bucket only; per-tenant fairness and API-key buckets are follow-ups.

## References

- `docs/architecture/http-layers.md`
- ADR 0004 (identity JWT), ADR 0005 (tenancy / RBAC)
