# Learning guide — Gateway service (lifecycle, production, resilience, SPOF)

**Service:** `services/gateway-service` (`@quickstart/service-gateway`)  
**Public port (local):** **3000**  
**ADR:** [0006-api-gateway.md](../adr/0006-api-gateway.md) (route list there is older than the code; this guide follows the code)  
**Membership cache:** [0012-membership-cache.md](../adr/0012-membership-cache.md)  
**Related:** [learning-identity-service.md](./learning-identity-service.md), [http-layers.md](../architecture/http-layers.md)

This guide explains the gateway as the **only public HTTP door**. It covers process lifecycle, the middleware path of one request, which upstream each route family hits, what the gateway refuses to do, how two replicas stay correct, and which pieces are a **single point of failure**.

---

## 1. What the gateway is

The gateway is a **thin backend-for-frontend (BFF)**. Browsers, mobile apps, and public SDKs call **one host**. The gateway checks a login token on protected routes, counts requests in Redis, and **proxies** the HTTP call to an internal service.

It does **not**:

- Store users, agents, messages, or knowledge.
- Call an LLM vendor.
- Hold phone audio or long-lived voice sockets.
- Replace workspace permission checks inside each service.

Those limits are the product design. At the roadmap target of **10,000 HTTP requests per second sustained** and **20,000 peak**, the edge must stay cheap. A model call or a voice socket on this process would exhaust CPU and memory and take the whole public API down with it.

Voice (5,000 inbound and 5,000 outbound calls) is a **different budget**. It belongs on **voice-service** later, not on port 3000.

**ADR note:** ADR 0006 lists only identity and workspace. The running gateway also proxies **agent, conversation, runtime, knowledge, and memory**. Model-gateway and web-fetch are **not** on the public route table. Clients do not call those ports through the gateway. Runtime calls the model gateway on the private network after a turn is accepted.

---

## 2. Lifecycle of the process

`startGatewayServer` in `src/index.ts` is the whole life of one copy.

### 2.1 Start (fail closed before listen)

1. **`loadGatewayConfig`**. If `JWT_ACCESS_SECRET` is missing or shorter than 32 characters, the process **throws and never listens**. Gateway and identity must share this secret or every protected route fails.
2. **`initTracing`**. Spans can export to the OpenTelemetry collector when that endpoint is set.
3. **Redis connect**. If Valkey/Redis is down, startup **throws**. The message tells you to run `make up`. There is no in-memory fallback for rate limits. A gateway that cannot count is not allowed to accept public traffic.
4. **Workspace access client**. The same Redis connection is wrapped by `createCachedWorkspaceAccessClient`. On a cache miss it HTTP-calls workspace-service. Positive cache TTL defaults to **60 seconds**. Negative (not a member) TTL defaults to **30 seconds**. If Redis errors on a membership read, the client logs `membership.cache_degraded` and **falls back to HTTP**. That is different from the rate limiter, which **fails the request** when Redis errors.
5. **`createGatewayServer`**. Builds Express with platform middleware and the route modules.
6. **`listen(port, "0.0.0.0")`**. Default port is `PORT` or `GATEWAY_PORT` or **3000**. Binding `0.0.0.0` is required inside Docker, Kubernetes, and a VPS. Binding only localhost would make the load balancer see connection refused.

Until step 6 finishes, the process is not a door. A bad secret or a dead Redis means **zero replicas serving**, which is safer than serving without a shared limit.

### 2.2 Steady state

The process keeps:

- One Redis client (rate-limit keys and membership cache keys).
- Upstream base URLs from the environment (no service discovery inside the process).
- No database pool. The gateway has **no Postgres**.

That is why a gateway replica is replaceable. You can kill it and start another with the same env. Sessions are JWTs. Counters live in Redis.

### 2.3 Shutdown (SIGINT and SIGTERM)

1. Log `shutdown`.
2. **`server.close`**. Stop accepting new connections. In-flight HTTP handlers may still finish until the platform timeout.
3. **`redis.quit`** if the client is open.
4. **`shutdownTracing`** so the last spans flush.
5. Process exits 0.

A load balancer should stop sending new traffic **before** SIGTERM (readiness or deregister). `/healthz` today does **not** flip to failing during shutdown by itself. Orchestrators usually remove the pod from the Service and then send SIGTERM. If you only watch `/healthz`, a dying process can still look healthy until the socket closes.

There is **no** long drain for voice on this process, because this process does not own voice.

---

## 3. Middleware order (one request, top to bottom)

Platform stack from `createPlatformApp` (the gateway does **not** pass an in-memory `globalRateLimit`):

```text
request id
  → tracing + logs
  → request timeout (HTTP_REQUEST_TIMEOUT_MS, default 30s)
  → JSON body parse (default 1mb)
  → routes
       → Redis rate limit          (mounted first inside the gateway router)
       → matched proxy or health
  → 404 platform error
  → platform error middleware
```

`trust proxy` is set to **1** inside the platform app. That means Express trusts **one** proxy hop when it computes `req.ip`. See the rate-limit section for why `X-Forwarded-For` still matters.

Per-route middleware runs **after** the Redis limit:

| Kind of route | Extra steps before proxy |
| --- | --- |
| `GET /healthz`, `GET /health` | None. Rate limit **skips** these paths. |
| Identity public (`/v1/register`, `/v1/login`, `/v1/refresh`, `/v1/logout`) | None. No JWT. |
| Identity protected (`/v1/me`, organizations, API keys) | Verify JWT, then proxy. |
| `POST/GET /v1/orgs/:orgId/workspaces` | Verify JWT, then proxy to workspace. **No** workspace-membership middleware, because the URL has `orgId`, not `workspaceId`. Workspace-service enforces org membership. |
| `/v1/workspaces/:workspaceId/...` | Verify JWT, **resolve workspace role** (cache then HTTP), then proxy. |

If the global timeout fires while the upstream is still working, the client gets a timeout from the gateway even if the upstream later succeeds. The upstream may still commit a write. That is why **idempotency keys** live in conversation and tool calls, not in the gateway. The gateway does not retry the upstream (`maxRetries: 0` in `proxyToUpstream`).

---

## 4. What a protected workspace request does

Example: `POST /v1/workspaces/{workspaceId}/conversations/{conversationId}/turns`.

1. **Rate limit.** Redis `INCR` on `gateway:rl:{clientIp}:{timeBucket}`. First hit in the bucket sets `EXPIRE`. If the count is above `HTTP_RATE_LIMIT_MAX` (default **300** per `HTTP_RATE_LIMIT_WINDOW_MS`, default **60 seconds**), the gateway returns **429** `RATE_LIMITED` and does not call runtime.
2. **JWT.** `requireAccessToken` verifies HS256 with `JWT_ACCESS_SECRET`. Missing or bad token → **401**. This check does **not** read the Redis revocation key. Logout revocation is enforced when identity validates the token. Other services still receive the Bearer token and should not treat a JWT as immortal.
3. **Membership.** `requireWorkspaceMembership` calls `workspaceAccess.resolveRole(workspaceId, jwt.sub, authorization, requestId)`. Cache key shape is `qs:membership:v1:{workspaceId}:{userId}` (ADR 0012). A hit avoids HTTP. A miss calls workspace-service. A deny can be cached for the negative TTL so a scanner does not hammer workspace. The gateway only checks that a **role exists**. It does **not** check `AGENTS_WRITE` or `TOOLS_RUN`. The upstream service still calls permission checks. Removing a member should **delete** the cache key in workspace-service. If that delete fails, the old role can remain for up to the positive TTL (default 60 seconds).
4. **Proxy.** `proxyToUpstream` builds `runtimeUrl + original path + query`. It forwards headers except hop-by-hop headers (`host`, `content-length`, `connection`, and similar). It sets `x-request-id`. It sets `Authorization: Bearer` to the same raw token. It sets `x-quickstart-auth-context` to base64url JSON with `tenantId` = JWT **`org_id`**, `actorId` = JWT **`sub`**, `roles` = **empty array**, and the request id. The body is `JSON.stringify(req.body)` for methods other than GET and HEAD.
5. **Response.** Status, content-type, and body text are copied back. The gateway does not reshape runtime JSON.

If runtime is down, `fetch` throws. Abort → **504** `UPSTREAM_TIMEOUT`. Other connection failures → **503** `UPSTREAM_UNAVAILABLE`. The handler does not wait forever. There is **no circuit breaker** in this proxy. Every new request still attempts the dead upstream until the timeout. Under a full outage that can pile up in-flight fetches up to the timeout window. That is a resilience gap, not a silent success.

---

## 5. Route map (allow-list)

The gateway is **not** a transparent reverse proxy of every internal port. If a path is not registered, the client gets **404** from the gateway even when the upstream process has that route. Adding a public API means adding a line in the right `proxy-*.routes.ts` file.

| External path | Upstream env | Default local | Gateway auth |
| --- | --- | --- | --- |
| `POST /v1/register`, `/v1/login`, `/v1/refresh`, `/v1/logout` | `IDENTITY_URL` | `:3001` | Public |
| `GET /v1/me`, `/v1/organizations…`, api-keys | `IDENTITY_URL` | `:3001` | JWT |
| `POST/GET /v1/orgs/:orgId/workspaces` | `WORKSPACE_URL` | `:3002` | JWT only |
| `/v1/workspaces/:workspaceId` and members, invites | `WORKSPACE_URL` | `:3002` | JWT + membership |
| `/v1/workspaces/:workspaceId/agents…` including publish, rollback, versions | `AGENT_URL` | `:3003` | JWT + membership |
| Conversations and messages | `CONVERSATION_URL` | `:3004` | JWT + membership |
| `POST …/conversations/:conversationId/turns` | `RUNTIME_URL` | `:3006` | JWT + membership |
| `/v1/workspaces/:workspaceId/knowledge` and `knowledge/*` | `KNOWLEDGE_URL` | `:3009` | JWT + membership |
| `/v1/workspaces/:workspaceId/memory` and `memory/*` | `MEMORY_URL` | `:3010` | JWT + membership |
| `GET /healthz`, `GET /health` | Local handler | — | Public, not rate limited |

**Not on the gateway:** model-gateway (`:3005`), web-fetch (`:3007`), voice (`:3008`). Those are internal or future edges. A leaked `MODEL_GATEWAY_URL` on a laptop must not be treated as a public URL in production.

Knowledge and memory use `router.all`, so any method under that prefix is forwarded after the same JWT and membership chain. Agent and conversation list methods one by one. A new conversation route (for example tool-call reads) is **not** public until someone registers it.

---

## 6. Rate limiting in detail

Key: `gateway:rl:{ip}:{bucket}`.

`clientIp` prefers the **first** address in `X-Forwarded-For`, then `req.ip`, then `"unknown"`.

Default budget: **300 requests per 60 seconds per IP**. Health paths are skipped so probes do not burn the budget.

**Two replicas** share this budget because the counter is in Redis. An in-memory `Map` would give each replica its own 300, so the real limit would be 300 times replica count. ADR 0006 rejects that.

**Redis error during INCR or EXPIRE:** the middleware returns **503** `UPSTREAM_UNAVAILABLE` with message `Rate limit store unavailable`. It does **not** allow the request. That is **fail closed**. Abuse control is treated as required, not best-effort.

**Redis error during membership lookup** is **not** the same policy. Membership falls back to workspace HTTP and logs `membership.cache_degraded`. A Redis blip can therefore do two different things on one turn request: the rate-limit middleware might 503 **before** membership runs, so you often never reach the fallback. If you ever split these onto two Redis deployments, document both policies again.

**Fairness gap (still unsafe):** one bucket per IP. One tenant behind one NAT shares a budget. One attacker who can rotate the forwarded IP can multiply the budget. ADR 0006 already says per-tenant and per-API-key buckets are follow-ups. Org API keys are **not** validated at the gateway today. JWT is the public credential the edge understands.

**Spoofing:** if a client can reach the gateway directly and set `X-Forwarded-For`, the limiter trusts the first hop. Production must put a proxy you control in front (TLS load balancer) that **overwrites** that header, and you should not expose port 3000 to the raw internet beside that proxy. `trust proxy = 1` helps `req.ip`, but this middleware reads the header itself first.

---

## 7. Production shape

```text
Clients
  → DNS
  → TLS load balancer / WAF (Slot 29 may be CloudFront + WAF + ALB; the Node process remains the BFF)
  → N gateway pods, same image, same JWT secret, same Redis, same upstream URLs
  → private network
       identity, workspace, agent, conversation, runtime, knowledge, memory
  → those services’ own Postgres and Redis uses
```

| Concern | Where it lives |
| --- | --- |
| TLS certificates | Load balancer, not inside gateway Node code today |
| JWT check | Every gateway replica, CPU only, no DB |
| Rate counters | Redis |
| Membership cache | Same Redis, short TTL, invalidated by workspace writes |
| Business data | Upstream services |
| Sticky sessions | **Not required.** Any replica can serve any request |

Config that must match across replicas:

- `JWT_ACCESS_SECRET` (same as identity)
- `REDIS_URL`
- Every `*_URL` upstream (or one internal DNS name per service)
- Timeouts and rate numbers, or you will debug “why is only half the fleet strict”

Upstream URLs should be **Service DNS** (Kubernetes) or a private load balancer, not a single pod IP. A pod IP in the env var is a hidden single point of failure even when you run two gateway copies.

The gateway stays stateless aside from the Redis client connection. You do not put uploads, session maps, or websocket voice on it.

**Deploy:** rolling update. New pod must connect to Redis in `startGatewayServer` before `listen`. If Redis is down, the new pod crashes and the old pods keep serving until they also fail their next Redis call (then they 503). That is availability coupled to Redis, described in the next section.

**Probes:** `/healthz` returns `{ status: "ok", service: "service-gateway" }` without checking Redis or upstreams. It is a **liveness** “process is up” signal. It is a weak **readiness** signal. A pod can pass `/healthz` while every real API call returns 503 because Redis is down. A stronger readiness check would ping Redis and maybe one cheap upstream. That check is **not** in this service yet. Do not send production traffic to a gateway that only just bound the port if Redis is not up; startup already refuses to listen in that case, but Redis can die **after** listen.

---

## 8. Resilience (what happens when something breaks)

| Failure | What the client sees | What stays safe |
| --- | --- | --- |
| Bad or missing JWT on a protected route | 401 from the gateway. Upstream is not called. | No anonymous write. |
| Over IP budget | 429. Upstream is not called. | One IP cannot fill every replica’s CPU without bound. |
| Redis down at startup | Process does not listen. | You do not run an unlimited edge. |
| Redis down after startup, on the limit check | 503 on that request (and the next ones). | You do not silently disable limits. The public API is **down for non-health routes** until Redis returns. |
| Redis down only inside membership cache | Would fall back to workspace HTTP **if** the rate-limit step already passed. | Membership still checked, slower. |
| Identity / workspace / runtime down | 503 or 504 from the gateway after timeout. | No retry storm from the proxy (`maxRetries: 0`). |
| Upstream returns 4xx/5xx | Same status and body forwarded. | Gateway does not hide domain errors. |
| Gateway process crash | Load balancer uses other replicas. In-flight requests on the dead process fail. | No data loss inside the gateway, because it stores none. |
| Wrong `JWT_ACCESS_SECRET` on one replica | That replica 401s all protected calls. | Other replicas with the right secret still work. This looks like a flaky API. |
| Membership cache stale after a role change, invalidation missed | Caller keeps the old allow for up to TTL. | Upstream permission checks are still the real authorization for the action. Gateway membership is an early reject, not the only reject. |
| Client retries a turn after gateway timeout | Runtime or conversation must treat the idempotency key as the real guard. | Gateway will proxy the retry as a **new** HTTP call. |

There is no bulkhead that isolates “runtime is slow” from “login is fast” inside one Node process. A flood of turns that each wait 30 seconds holds sockets and memory on the gateway even though the gateway does not run the model. Timeouts cap that wait. They do not give you separate thread pools per upstream. At 10,000 requests per second you size **replicas** and you keep each request short. Long voice sockets are banned from this process for that reason.

---

## 9. Single points of failure (SPOF), named honestly

A SPOF is a part whose failure removes a capability you still need. Some SPOFs are accepted for now. Some are already removed by running two copies.

### 9.1 Removed if you run at least two gateway replicas

**One gateway process** is a SPOF for the entire public HTTP API. Two or more replicas behind a load balancer remove that process SPOF. They only work if they share Redis and secrets. Two replicas with two in-memory limiters would be the wrong fix.

### 9.2 Still a SPOF: Redis used for rate limits

Every gateway replica depends on Redis to **accept** a non-health request. If that Redis is one node with no replica and no failover, **Redis is a SPOF for the public API**, because the limiter fails closed. Membership cache can fall back to HTTP, but the limiter cannot.

Production shape for this dependency is a Redis (or Valkey) deployment with failover, not a single container on the same VM as the only gateway with no backup. On a laptop, one Valkey container is acceptable. On the 10,000 request per second target, it is not.

### 9.3 SPOF per product area: one upstream replica

The gateway does not duplicate identity or runtime. If you run one identity process, identity is a SPOF for login even when you have five gateways. Same for runtime and turns, workspace and membership HTTP on cache miss, and so on. The gateway’s job is to **fail that route** with 503/504, not to invent data.

Point upstream URLs at a **service** with several pods, not at one pod IP.

### 9.4 Not a SPOF inside the gateway: Postgres

The gateway has no database. A Postgres failover does not require a gateway schema migration. Upstream services feel the database. The gateway only sees slow or failed HTTP.

### 9.5 Not this process: voice

Putting 10,000 audio sockets on the gateway would make the gateway a SPOF for **calls and HTTP together**. The roadmap forbids that. Voice gets its own process, its own drain time, and its own Redis caps. The HTTP SPOF and the call SPOF stay separate on purpose.

### 9.6 Secret and config SPOFs

One shared `JWT_ACCESS_SECRET` is required for correctness, but the **secret store** and the way you roll it are operational SPOFs. A bad deploy that changes the secret on the gateway only, not on identity, fails closed (401s), which is safer than accepting forged tokens. Rotation should overlap keys the way ADR 0004 describes, not a hard cut on one service.

### 9.7 Logical SPOF: the route table in git

There is one gateway code path for the public map. A bad release that deletes a proxy route removes that API for every replica at once. That is why route modules are split by feature (`proxy-agent`, `proxy-conversation`, …) and why two people should not edit `routes/index.ts` on the same day. Rollback of the gateway image restores the map. There is no second router hiding in another service.

---

## 10. What “stateless” does and does not mean

Stateless means a request does not need the **same** gateway replica next time, and a restart does not lose tenant data.

It does **not** mean the system has no shared dependencies. Redis is shared state for counters and cache. JWT verification is stateless. Rate limiting is not.

It does **not** mean the gateway is safe to bypass. If a client can hit `identity-service:3001` on a public IP, they skip the edge limiter (identity still has its own smaller limiter). Production network policy should allow only the gateway (and health probes from the orchestrator) to reach upstream ports.

---

## 11. Code map

```text
src/index.ts                         start, Redis required, SIGTERM
src/config/environment.ts            ports, upstream URLs, TTLs, rate numbers
src/http/create-server.ts            JWT middleware, membership middleware, no in-memory limit
src/http/routes/index.ts             rate limit first, then route modules
src/middleware/redis-rate-limit.ts   INCR + EXPIRE, 429 or 503
src/middleware/require-access-token.ts
src/middleware/require-workspace-membership.ts
src/lib/protected-workspace-proxy.ts JWT + membership + proxy
src/lib/proxy.ts                     no retry, timeout, auth-context header
src/http/routes/proxy-*.routes.ts    the allow-list
src/http/routes/health.routes.ts     liveness only
```

---

## 12. Local lab

1. `make up` so Redis is up.  
2. Start identity, workspace, and gateway with the **same** `JWT_ACCESS_SECRET`.  
3. `curl -s http://127.0.0.1:3000/healthz` and confirm `service-gateway`.  
4. `POST /v1/login` through port 3000, not 3001.  
5. Call a workspace route with the Bearer token and a workspace id you belong to.  
6. Stop Redis and call `/v1/login` again. You should see the rate-limit store error (503), not a successful login. `/healthz` can still return 200. That contrast is the readiness gap.  
7. Stop runtime only and post a turn. You should see upstream unavailable or timeout, with `request_id`, and you should not see the gateway retry in a loop.

---

## 13. Self-check

1. Why does the gateway refuse to start when Redis is down, instead of serving with an in-memory counter?  
2. Why can two gateway replicas share one rate-limit budget?  
3. What is the difference between a Redis failure in the rate limiter and a Redis failure in the membership cache?  
4. Why is `/healthz` a weak readiness check?  
5. Which checks run before a conversation turn is proxied to runtime?  
6. Why is `maxRetries: 0` on the proxy part of resilience?  
7. Name two upstreams that are **not** on the public gateway, and say why.  
8. In what way is one gateway process a SPOF, and what removes that SPOF?  
9. In what way does Redis remain a SPOF even after you add gateway replicas?  
10. Why must voice sockets not be added to this process if you care about the HTTP SPOF and the call SPOF staying separate?

---

## 14. One-page card

```text
Door            :3000 only public HTTP
Start           JWT secret >= 32 chars, Redis connect, then listen 0.0.0.0
Stop            SIGTERM → server.close → redis.quit → traces
Limit           Redis gateway:rl:{ip}:{bucket}, default 300 / 60s, fail closed
Health          /healthz does not check Redis (liveness, not readiness)
Protected WS    JWT → membership cache/HTTP → proxy, no retry
Auth context    tenantId = org_id, actorId = sub, roles = []
Not here        model-gateway, web-fetch, voice sockets, business DB
SPOF removed    second gateway replica + load balancer
SPOF remains    Redis for limits; each upstream if it has one replica; secret mismatch
```
