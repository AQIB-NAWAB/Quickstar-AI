# HTTP middleware: gateway vs service

QuickStart exposes a **public gateway** (`services/gateway-service`, Slot 06) and **internal HTTP services** (identity, workspace, …). Both can run middleware; they solve different problems. See [ADR 0006](../adr/0006-api-gateway.md).

## Gateway (Slot 06 — public edge)

| Concern                | Role at gateway                                               |
| ---------------------- | ------------------------------------------------------------- |
| TLS termination        | Clients talk to one HTTPS host                                |
| Authentication         | Validate JWT / API keys for **external** callers              |
| Tenant / org context   | Attach tenant to downstream requests                          |
| **Edge rate limiting** | Per IP, per key, per tenant — protect the platform from abuse |
| Routing                | `/v1/...` → internal service URLs                             |
| Request ID             | Generate or forward `x-request-id` for the whole trace        |

Gateway limits are **coarse and global**: “this client may only N requests/minute to the platform.”

## Service (identity-service, template, …)

Each service uses **`@quickstart/http-server`** (Express) with:

- **`createPlatformApp`** — platform middleware only; mounts a pre-built `apiRouter`.
- **`createApiRouter` + route modules** — each module (`health.routes.ts`, `auth.routes.ts`, tenant-scoped routes, …) returns a router; the service composes them under `src/http/routes/`.

1. Request ID
2. Tracing + structured logs
3. **Request timeout** — stop hung handlers from tying up workers
4. JSON body size limit
5. **Service rate limit** — backup when gateway is bypassed (local dev, misconfigured network, future internal callers)
6. Stricter limits on **auth routes** (login/register) inside identity

| Concern              | Role at service                                              |
| -------------------- | ------------------------------------------------------------ |
| Timeout              | Protect **this process** even if gateway timeout fails       |
| Body size            | Reject huge payloads before business logic                   |
| Rate limit (default) | Defense in depth; not a substitute for gateway               |
| Auth route limit     | Credential stuffing on `/v1/login`, `/v1/register`           |
| Domain auth          | Identity validates its own Bearer tokens on protected routes |

## Why both?

- **Local dev:** `curl` hits identity on `:3001` with no gateway → service limits still apply.
- **Blast radius:** A bug or bypass at the edge should not leave services unlimited.
- **Different scopes:** Gateway = tenant/client fairness; service = expensive endpoints and process health.

When the gateway ships, keep service timeouts and body limits; **tighten edge rate limits** and treat service limits as a safety net.

See also: roadmap Slot 06 middleware order (`request_id → timeout → auth → tenant → rate limit → route`).
