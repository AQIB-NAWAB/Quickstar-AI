# Learning guide — Identity service (full request path)

**Service:** `services/identity-service` (`@quickstart/service-identity`)  
**Public port (local):** identity **3001**, clients should use gateway **3000**  
**ADR:** [0004-identity.md](../adr/0004-identity.md)  
**Threats:** [identity-threats.md](../security/identity-threats.md)  
**Layout notes:** [services/identity-service/ARCHITECTURE.md](../../services/identity-service/ARCHITECTURE.md)

This guide explains identity in one continuous depth: what the product owns, how a request enters the **gateway**, how the gateway **forwards** it, how **identity** checks the token and writes Postgres and Redis, and how the same design looks when you run **more than one copy** in production.

Language is plain and technical. Sentences stay complete so you can read them as a lesson, not as notes.

---

## 1. What identity owns (and what it does not own)

Identity is the **bounded context** for people who log in, the **organization** they belong to, the **session** that proves they logged in, and **organization API keys** used by automation.

| Identity owns | Identity does not own |
| --- | --- |
| User email and password hash | Workspace roles and invites (workspace-service, Slot 05) |
| Organization row and **org membership** (`owner` or `member`) | Agent configuration, conversations, runtime turns |
| Access JWT and refresh token rotation | Public edge rate limit policy of the gateway (gateway still has its own limiter) |
| Org API keys (hash stored, raw key shown once) | Billing ledger, full audit product |

Other services **must not** query identity tables. They either trust a token the **gateway already verified**, or they call identity over HTTP. That boundary is the reason identity is its own process on port **3001**.

**Organization is not the workspace.** The organization is the company account. The workspace (later) is the tenant id on agents and chats. The access JWT today carries **`org_id`**. The gateway copies that value into `AuthContext.tenantId` when it proxies. After workspace work, tenant meaning in the wider platform becomes **workspace id**. Do not mix those two ids in your head when you read older comments.

---

## 2. How a request looks from the outside

A browser, mobile app, or `curl` should talk to the **gateway**, not to identity on the public internet.

```text
Client
  HTTPS  →  gateway-service :3000
               JWT check (only on protected routes)
               proxy HTTP
           →  identity-service :3001  (private network in production)
               business rules
           →  Postgres (users, orgs, refresh hashes, api key hashes)
           →  Redis/Valkey (session revocation flags)
  ← JSON response copied back through the gateway
```

Local defaults:

- Gateway: `http://127.0.0.1:3000`
- Identity: `IDENTITY_URL` default `http://127.0.0.1:3001`
- Postgres: host port **5433**
- Redis: **6379**

Identity also listens on **`0.0.0.0`**, so a container can receive traffic. In production you still **do not publish 3001** to the world. Only the gateway (or an internal mesh) should reach it.

---

## 3. Single-depth walk — login (public route)

This section follows **one** request from the client until tokens exist in the database. Login is **public**. The gateway does **not** require a Bearer token.

### 3.1 Client

```http
POST /v1/login HTTP/1.1
Host: api.example.com
Content-Type: application/json

{"email":"a@example.com","password":"correct-horse"}
```

### 3.2 Gateway process (`services/gateway-service`)

1. Platform middleware runs first (request id, tracing, timeout, JSON body parse, gateway rate limit). The body is already a JavaScript object on `req.body`.
2. The route table matches `POST /v1/login` in `proxy-identity.routes.ts`.
3. That route uses **`publicProxy`**. There is **no** `requireAccessToken` middleware.
4. `proxyToUpstream` builds the upstream URL as `identityUrl + original path + query`. For this call that is `http://127.0.0.1:3001/v1/login`.
5. Hop-by-hop headers (`host`, `content-length`, `connection`, …) are **not** forwarded. `x-request-id` **is** set to the gateway request id so logs on both sides share one id.
6. Because the method is POST, the gateway **re-serializes** `req.body` to JSON and sends it with `fetchWithPolicy`.
7. Retries are **`maxRetries: 0`**. A login must not be retried blindly by the proxy. If identity is down or the timeout fires, the gateway returns `UPSTREAM_UNAVAILABLE` or `UPSTREAM_TIMEOUT` in the platform error envelope.
8. When identity answers, the gateway copies **status**, **content-type**, and the **raw body text** back to the client, and sets `x-request-id` again.

The gateway does **not** hash the password and does **not** write the user row. It is a door.

### 3.3 Identity HTTP stack (`createHttpServer`)

Identity uses the same platform app as other services:

```text
request id → tracing → timeout → JSON body → global rate limit → routes → 404 → error middleware
```

On top of that, **`/v1/login` and `/v1/register`** add a **stricter auth rate limit** (default **20** requests per window, while the global default is **120**). Health paths `/healthz`, `/health`, and `/readyz` skip the global limiter so probes stay cheap.

`readJsonBody` prefers the Express-parsed `req.body`. So the JSON the gateway forwarded is parsed again inside identity. That second parse is normal. The gateway and identity are two HTTP servers.

### 3.4 Controller → service

`auth.routes.ts` calls `handleLogin`, which reads `email` and `password` and calls `auth.login`.

`loginUser` does this:

1. Load the user by email (`findUserByEmail`). The stored email was **lowercased on register**. Login trims the email. If the client sends mixed case, lookup can miss unless the store normalizes. Treat email as **case-sensitive to whatever was stored**, and always register in lowercase (the register path already lowercases).
2. Verify the password with **scrypt** (`verifyPassword`). The database never stores the raw password. It stores `password_hash`.
3. If the user is missing **or** the password is wrong, the error is the **same** message: `Invalid email or password`. That is intentional. It reduces account enumeration on the login path. Register uses a different conflict message when the email already exists (`Unable to register with these details`).
4. `resolveOrgForUser` loads organizations for the user and takes **the first** organization id. There is no “switch org” API in this slot. The JWT `org_id` is that first org.
5. A new **`sessionId`** (UUID) is created. Login always starts a **new session**. It does not reuse an old session id.
6. `issueTokens` signs the access JWT and inserts a refresh row.

### 3.5 What gets written

**Access token (JWT, HS256)** claims:

| Claim | Meaning |
| --- | --- |
| `sub` | User id |
| `org_id` | Organization id chosen above |
| `sid` | Session id |

Default access TTL is **900 seconds (15 minutes)** (`JWT_ACCESS_TTL_SECONDS`). The signing secret is `JWT_ACCESS_SECRET` and must be at least **32 characters** or the process refuses to start.

**Refresh token:** 32 bytes of random material, returned **once** in the JSON as `refresh_token`. Postgres stores only **`SHA-256` hash** in `refresh_tokens.token_hash` (unique). Columns include `user_id`, `session_id`, `expires_at`. Default refresh lifetime is **604800 seconds (7 days)**.

Response shape (plus `request_id`):

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque>",
  "token_type": "Bearer",
  "expires_in": 900
}
```

Redis is **not** written on a successful login. Redis is written when a session is **revoked** (logout or refresh-token reuse).

### 3.6 Register is the same door, different writes

`POST /v1/register` is also `publicProxy`. Identity validates email shape, password length **at least 8**, and a non-empty `organization_name`. It creates **user + organization + owner membership** in one store operation (`createUserWithOrg`), then issues tokens the same way as login. HTTP status is **201**.

If two registers race on the same email, the unique constraint on `users.email` is the real lock. The service maps database errors through `rethrowDatabaseError` so the client still sees a platform error, not a raw SQL string.

---

## 4. Single-depth walk — `GET /v1/me` (protected route)

This is the path you should memorize for **every authenticated identity call**.

### 4.1 Client

```http
GET /v1/me HTTP/1.1
Authorization: Bearer <access_jwt>
```

### 4.2 Gateway — token is checked **before** the proxy

`GET /v1/me` uses **`protectedProxy`**, which is two steps:

1. **`requireAccessToken`** (`gateway-service` middleware).
2. Then `proxyToUpstream` with the verified claims **and** the raw Bearer string.

`requireAccessToken` does only this:

- Read `Authorization: Bearer`.
- `verifyAccessToken` with the **same** `JWT_ACCESS_SECRET` the identity service uses.
- On success, store `res.locals.accessToken` (claims) and `res.locals.rawBearerToken`.
- On failure, return **401** and **do not call identity**.

Important limit: the gateway check is **signature and expiry**. It does **not** ask Redis “is this session revoked?”. Revocation is enforced when **identity** validates the token again (next section). If a future service trusted only the gateway and never re-checked Redis, a logged-out session could still look valid until the access JWT expired (up to 15 minutes). Identity’s own routes close that gap because they call `validateAccessToken`.

### 4.3 What the gateway adds on the upstream request

`forwardRequestHeaders` sets:

- `x-request-id`
- `Authorization: Bearer <raw token>` again (so identity can validate)
- Header **`x-quickstart-auth-context`** (name from `AUTH_CONTEXT_HEADER`) with serialized JSON:

```text
tenantId = JWT org_id
actorId  = JWT sub (user id)
roles    = []          (empty here; workspace roles are not identity’s job)
requestId = same request id
```

Identity’s `/v1/me` path does **not** trust that header as the only proof. It runs `requireAuthMiddleware`, which reads the **Bearer** again. The auth-context header is the contract for **other** services that want “the gateway already authenticated this caller.” Identity still does its own check so revocation and “user still exists” stay inside the service that owns sessions.

### 4.4 Identity middleware `requireAuthMiddleware`

1. Missing Bearer → `UNAUTHORIZED` / `Missing Bearer token`.
2. `auth.validateAccessToken(token)`:
   - Verify JWT with the same secret.
   - If Redis key `identity:session:revoked:{sid}` equals `"1"`, reject with `Session revoked`.
   - Load the user by `sub`. If the row is gone, reject with `User not found`.
3. Set `res.locals.identityAuth = { userId, sessionId }`.
4. Controller `handleGetMe` loads the profile by `userId` only. It does not take a user id from the query string. That is how you avoid “tell me someone else’s profile” on this route.

Org membership is **not** checked on every Bearer call. The comment in `validateToken` says membership is checked on **organization and API key routes**. `/v1/me` only proves the user and session.

---

## 5. Refresh, logout, and why Redis exists

Access JWTs are short so a stolen access token dies quickly. Refresh tokens live longer, so they need **storage, rotation, and revocation**. A JWT-only design was rejected in ADR 0004 because you cannot kill a session without a denylist or a store.

### 5.1 `POST /v1/refresh` (public on the gateway)

Body carries `refresh_token`. Identity hashes it and calls `rotateRefreshToken` in one database operation:

| Outcome | What the service does |
| --- | --- |
| `invalid` | 401 `Invalid refresh token` (unknown, expired, or already revoked row) |
| `reuse` | Someone presented a refresh token that was **already rotated**. That usually means theft or a buggy client retrying an old token. The service revokes the **whole session** in Redis (`identity:session:revoked:{sid}` with TTL = refresh lifetime) and revokes remaining refresh rows for that `session_id`, then returns 401 `Refresh token reuse detected`. |
| success | New refresh hash is stored, old row points at the replacement (`replaced_by_id`). A **new access JWT** is signed for the **same** `session_id`. Redis is checked; if the session is already revoked, refresh fails. |

The client must **store the new refresh token** and throw away the old one. If the client retries the old refresh after success, the next call looks like **reuse** and the session dies. That is strict on purpose.

Gateway proxy still uses **`maxRetries: 0`**. A retried refresh from the proxy would be dangerous. The client may retry only when it still holds the **current** refresh token and the first call never reached identity.

### 5.2 `POST /v1/logout`

Logout can use a refresh token in the body and/or a session id from a Bearer access token (see `handleLogout` in the controller). The service:

1. Marks the refresh row revoked when the hash is found.
2. Sets the Redis revocation key for the session.
3. Revokes other refresh rows for that session in Postgres.

After logout, **new** calls to identity that run `validateAccessToken` fail even if the access JWT has not expired yet. The gateway’s signature check alone would still pass until expiry; identity routes will not.

### 5.3 Redis is mandatory at startup

`startIdentityServer` connects to Redis **before** it listens. If Redis is down, the process **throws** and does not serve traffic. The ADR says session revocation is not optional. A noop in-memory revocation exists only for **unit tests**, not for the running server.

`GET /readyz` runs probes: `SELECT 1` on Postgres and `PING` on Redis. Load balancers should use **readiness** to stop sending traffic when the database or Redis is sick. `/healthz` only means the process is up.

---

## 6. Organizations and API keys

Routes (all **protected** on the gateway, then membership-checked inside identity):

| Method | Path | Rule |
| --- | --- | --- |
| GET | `/v1/organizations` | Bearer; list orgs for this user |
| GET | `/v1/organizations/:orgId` | Bearer; must be a member |
| POST | `/v1/organizations/:orgId/api-keys` | Bearer; member; creates key |
| GET | `/v1/organizations/:orgId/api-keys` | Bearer; member; list **without** raw secret |
| DELETE | `/v1/organizations/:orgId/api-keys/:keyId` | Bearer; member; sets `revoked_at` |

`createApiKey` checks `getMembership(orgId, userId)`. If user A calls org B’s URL, the answer is **403** `Not a member of organization`. That is the IDOR control from the threat model. Tests should keep a case “user A cannot read org B.”

API key format is `qs_live_` plus random material. Postgres stores **`key_prefix`** (lookup) and **`key_hash`**. The raw `api_key` is returned **only in the create response**. List responses show prefix and name, not the secret. There is no in-place rotation. You revoke and create a new key.

---

## 7. Database shape (what must survive a restart)

Schema file: `services/identity-service/migrations/001_identity_schema.sql`. Apply with **`make identity-migrate`**. Migrations do **not** run on HTTP startup.

| Table | Role |
| --- | --- |
| `users` | `id`, unique `email`, `password_hash` |
| `organizations` | `id`, `name` |
| `org_memberships` | `(org_id, user_id)` primary key, role `owner` or `member` |
| `refresh_tokens` | hash unique, `session_id` indexed, `replaced_by_id`, `revoked_at`, `expires_at` |
| `api_keys` | prefix index where not revoked, hash, `org_id`, `created_by` |
| `schema_migrations` | which SQL version ran |

**Nothing that must stay correct across two identity replicas may live only in a Node `Map`.** Refresh state is Postgres. Revocation flags are Redis so every replica sees logout. The test-only `Set` in `createNoopSessionRevocation` would be wrong in production because replica B would not see a revoke done on replica A.

Passwords and tokens must not appear in logs. Structured logging is part of the platform libraries. If you add a log line, log **user id** and **request id**, not the refresh string.

---

## 8. Code map (where to read next)

```text
Gateway
  src/http/routes/proxy-identity.routes.ts   which paths are public vs protected
  src/middleware/require-access-token.ts     JWT verify at the edge
  src/lib/proxy.ts                           forward headers, no retry, timeout

Identity
  src/index.ts                               Postgres + Redis connect, listen 0.0.0.0
  src/http/create-server.ts                  rate limits + auth guard wiring
  src/http/routes/auth.routes.ts             register, login, refresh, logout
  src/http/routes/users.routes.ts            GET /v1/me
  src/middleware/auth.middleware.ts          Bearer → res.locals.identityAuth
  src/services/auth.service.ts               tokens, rotation, reuse detection
  src/services/api-keys.service.ts           membership + hash at rest
  src/utils/session-revocation.ts            Redis key identity:session:revoked:{sid}
  src/utils/password-hasher.ts               scrypt + token hash
  migrations/001_identity_schema.sql
```

Internal layering (from ARCHITECTURE.md):

```text
HTTP route → controller → service → repository (TypeORM store)
```

Controllers parse HTTP. Services hold rules. The repository is the only place that should know table names.

---

## 9. How this looks in production (same design, more machines)

Local Docker Compose is one laptop. Production keeps the **same HTTP contracts** and changes **where** the processes sit.

### 9.1 Network

```text
Internet
  → TLS load balancer
  → N copies of gateway (stateless except Redis rate-limit counters)
  → private DNS name for identity (ClusterIP / internal LB)
  → N copies of identity-service
  → managed Postgres (one primary; pooler in front if connection count is high)
  → managed Redis (revocation keys)
```

Identity replicas share:

- **`JWT_ACCESS_SECRET`** (or a key set with `kid` during rotation — ADR 0004). If gateway and identity disagree on the secret, every protected call fails at the gateway or at identity.
- **`DATABASE_URL`**
- **`REDIS_URL`**

They do **not** share memory. Logout on replica 1 is visible on replica 2 only because Redis and Postgres are shared.

### 9.2 Secrets

| Secret | Laptop | Production |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | `.env` | Secret store, not the git repo, not the image |
| Database password | Compose defaults | Managed DB secret, rotated |
| Redis | local URL | Private network, auth enabled |

If the JWT secret leaks, the incident path in ADR 0004 is: rotate the secret, deploy gateway and identity together, revoke sessions (Redis and refresh rows), and re-issue API keys for affected orgs. A stolen **access** token still dies in 15 minutes even before you rotate, but a stolen **refresh** token does not, which is why reuse detection and logout exist.

### 9.3 Rate limits and abuse

Two layers exist on purpose:

- **Gateway** limiter: fairness for the whole public API.
- **Identity** global limiter (default 120 / window) plus **auth** limiter (default 20 / window) on register and login.

If someone bypasses the gateway and hits identity on a private port, identity still slows credential stuffing. Production should still **firewall** port 3001 so the bypass is not possible from the internet.

Login errors stay generic. That does not stop a patient attacker, but it stops the cheap “this email exists” check.

### 9.4 Timeouts and failure

`fetchWithPolicy` from the gateway uses the gateway timeout and **zero retries**. If identity is slow (database lock, Redis stall), the client sees a gateway upstream error with the **same request id**. Identity’s own request timeout protects the Node process so one hung handler does not pin a worker forever.

If Postgres is down, identity should fail **readiness**. The load balancer stops new requests. In-flight requests fail with database errors mapped to platform codes. You do not fall back to “allow login from memory.”

If Redis is down at **startup**, identity does not boot. If Redis dies **after** boot, revocation checks throw or fail closed depending on the client error path. Treat Redis as part of the login **availability** budget, not as an optional cache. A cache miss on membership (workspace feature) can fall back to HTTP. A missing revocation store must **not** mean “everyone is logged in.”

### 9.5 Scale numbers (honest)

Identity is not the 10,000 model-calls path. It is still hot because **every login, refresh, and many `/v1/me` calls** hit it, and protected gateway routes verify JWT on **every** API call (CPU on the gateway, not a DB hit).

| Piece | What limits you |
| --- | --- |
| Gateway JWT verify | CPU, cheap compared with a database |
| Login / register | scrypt is **deliberately slow** (CPU). A few dozen logins per second per identity replica is a healthier expectation than thousands. Add replicas when CPU saturates. |
| Refresh | One Postgres transaction per refresh. Unique hash and rotation must stay correct under concurrency. |
| `/v1/me` | JWT verify + Redis GET + user row read |
| API keys | Membership read + hash write; not the chat hot path |

Horizontal scale means **more identity replicas** behind one private address, not a bigger in-process session map. Vertical scale (more CPU) helps scrypt. It does not fix a revocation flag that only one process knows.

Connection count: each replica opens a Postgres pool. At many replicas you put a **pooler** (PgBouncer or the cloud proxy) in front so Postgres `max_connections` is not exhausted. That requirement is already in the roadmap scale rules.

### 9.6 Deploys

Rolling update: new pods pass `/readyz` (DB + Redis) before they receive traffic. Old pods get **SIGTERM**, close the HTTP server, quit Redis, destroy the TypeORM connection, and flush traces (`src/index.ts`). Access tokens keep working across the deploy because they are stateless JWTs. Refresh rows stay in Postgres. You do not need sticky sessions.

---

## 10. Threats (short, tied to code)

| Threat | What we do in this service |
| --- | --- |
| Credential stuffing | Generic login error; auth rate limit; scrypt cost |
| Stolen access token | 15 minute TTL; HTTPS in production; revocation on logout for identity routes |
| Stolen refresh token | Hash at rest; rotation; **reuse kills the session** |
| IDOR on org or keys | Membership check on org and key routes |
| API key in a backup | Only hash and prefix stored |
| JWT secret leak | Secret manager + rotation runbook, not a code change inside a request |

Full table: [docs/security/identity-threats.md](../security/identity-threats.md).

---

## 11. Local lab (do this once)

1. `make up` so Postgres and Valkey exist.  
2. `make identity-migrate`.  
3. Start identity (`PORT` / `IDENTITY_PORT` 3001) and gateway (`3000`) with the **same** `JWT_ACCESS_SECRET`.  
4. `POST http://127.0.0.1:3000/v1/register` with email, password, `organization_name`.  
5. `GET http://127.0.0.1:3000/v1/me` with `Authorization: Bearer <access_token>`.  
6. `POST /v1/refresh` with the refresh token. Confirm the old refresh token fails the second time (reuse).  
7. `POST /v1/logout`, then call `/v1/me` again and expect **401** from identity’s revocation check.

Watch both processes’ logs for the **same** `request_id`.

---

## 12. Self-check

Answer in full sentences.

1. Why does login go through the gateway if identity is the service that checks the password?  
2. Which header does the gateway add so downstream services can see `actorId` without parsing the JWT themselves?  
3. Why does identity validate the Bearer again on `/v1/me` even after the gateway already verified the signature?  
4. What is stored in Postgres for a refresh token, and what is returned to the client?  
5. What happens when a client sends a refresh token that was already rotated?  
6. Why does the identity process refuse to start when Redis is down?  
7. Why is scrypt a scaling limit on login but not on `GET /v1/me`?  
8. How does user A get rejected when they call `/v1/organizations/{orgB}/api-keys`?  
9. What must be identical on every gateway replica and every identity replica for protected routes to work?  
10. Why is `maxRetries: 0` on the gateway proxy the correct choice for `/v1/refresh`?

---

## 13. What this guide does not cover

- Workspace RBAC and membership cache (Slot 05 and 09B). Those checks sit on **workspace** routes, not inside identity tables.  
- How the runtime uses the user. The runtime trusts gateway auth and workspace permissions. It does not read `users.password_hash`.  
- SSO and social login. They are not in Slot 04.

When those topics are next, keep this picture: **identity proves who the human or API key is; workspace proves what they may do inside a tenant.**

---

## 14. One-page card

```text
Public door     POST /v1/register|login|refresh|logout  → gateway publicProxy → identity
Protected door  GET /v1/me, /v1/organizations, api-keys → gateway JWT verify → proxy Bearer + auth context → identity validates again (Redis revoke)
Access token    JWT sub, org_id, sid, ~15 min
Refresh token   opaque, hash in Postgres, rotate, reuse = kill session
Redis key       identity:session:revoked:{sid}
API key         qs_live_… shown once, hash + prefix in Postgres
Production      private identity, shared JWT secret, shared Postgres, shared Redis, readiness = DB + Redis, no in-memory sessions
```
