# Learning guide — Slot 01: Engineering foundation

**Roadmap feature:** 01 — Engineering foundation  
**Status:** Done  
**ADR:** [0001-monorepo-and-service-boundaries.md](../adr/0001-monorepo-and-service-boundaries.md)  
**Prerequisite:** [learning-from-zero.md](./learning-from-zero.md) Modules 0–2  
**Next slot:** [Slot 02 — Local data plane](../architecture/local-data-plane.md) (Docker Compose)

This guide teaches **Slot 01** in depth: why the monorepo exists, how folders connect, and how `services/_template` becomes the pattern for every later service (identity, gateway, runtime, …).

---

## 1. Learning objectives

When you finish this guide, you should be able to:

1. Explain **why** QuickStart uses a monorepo with `services/*` and `packages/*`, and what we rejected (polyrepo, monolith-first).
2. Run **`pnpm install`** and **`pnpm check`** and say what each root script does.
3. Draw the **request path** for `GET /healthz` from TCP listen to JSON response.
4. Describe the **route module pattern** (`RouteModule`, `createApiRouter`, `createPlatformApp`) used in every HTTP service.
5. Run the template locally, hit **`/healthz`**, and run its **Node test** file.
6. Explain why **`0.0.0.0`** binding matters for Docker and cloud (Render, Contabo, Kubernetes).
7. State what **Slot 01 does not include** (no Postgres product data, no gateway, no LLM) so you do not confuse foundation with the full platform.

---

## 2. What Slot 01 is (plain definition)

**Slot 01** is the **engineering skeleton** of QuickStart AI:

- One **git monorepo** with a fixed layout.
- **pnpm workspaces** so many packages build and test together.
- **TypeScript on Node 22+**, ESM (`"type": "module"`).
- A **service template** (`services/_template`) that exposes a minimal HTTP API starting with **`GET /healthz`**.
- Root **CI-shaped scripts** (`lint`, `typecheck`, `test`, `build`, `check`).
- **ADR 0001** recording the boundary rules: new services **copy the template**, do not invent a new folder shape each time.

Slot 01 is **not** a product feature customers see. It is the **factory layout** for everything that comes after (identity, agents, runtime, voice).

**Note on the repo today:** The template also wires **platform libraries** (errors, logging, tracing, demo routes) added in **Slot 03**. When you learn Slot 01, focus on **layout + health + server lifecycle**; treat `/demo/*` as a **preview** of Slot 03, not as “day one” scope.

---

## 3. Why now (what breaks if you skip this)

| If you skip Slot 01 discipline | What happens later |
| --- | --- |
| Each service has its own repo layout | Contract drift, painful cross-service PRs, SDK cannot assume one error shape |
| No shared `healthz` / shutdown pattern | Kubernetes liveness/readiness and graceful deploys are guesswork |
| No `pnpm check` at root | One service breaks TypeScript; nobody notices until gateway integration |
| “Monolith in one folder” | Voice and events force a painful split under fire |

The roadmap assumes **two engineers** can ship **parallel features** in different `services/<name>` directories. That only works if Slot 01 layout is already muscle memory.

---

## 4. Junior shortcut vs production shape

### Junior shortcut

- One `server.js` with Express routes in a single file.
- `console.log` for errors.
- Listen on `localhost` only.
- No tests; “curl once” is the test.

### Production failure it hides

- **Two replicas:** in-memory rate limits and session maps diverge (roadmap calls this out for gateway later).
- **Containers:** binding `127.0.0.1` makes the service unreachable from outside the container.
- **On-call:** no `request_id` in errors; cannot trace a user request across services.
- **Deploy:** no SIGTERM handler; in-flight requests cut on rolling update.

### Production shape (what `_template` starts)

- **`createPlatformApp`** — shared middleware order (request id → tracing → timeout → JSON → rate limit → routes → 404 → errors).
- **Structured errors** — `AppError` + stable `ErrorCode` (Slot 03 package, used in template tests).
- **Listen on `0.0.0.0`** — correct for Docker/Kubernetes/Render.
- **SIGINT / SIGTERM** — close server, flush tracing.
- **Tests** — spin server on port `0`, assert `/healthz` and error envelope.

---

## 5. ADR 0001 — decisions you inherit

Read the full ADR; summary:

| Decision | Meaning for you |
| --- | --- |
| Monorepo `services/*` + `packages/*` | Deployables vs shared libraries stay separate |
| TypeScript on Node | Default for API services |
| HTTP/JSON between services | Not gRPC-first for MVP |
| One ADR per slot | You can trace “why” per feature |
| Copy `_template` for new services | `identity-service`, `agent-service`, etc. all rhyme |

**Rejected:** polyrepo (too slow for a small team), monolith-first (conflicts with voice/events learning goals).

---

## 6. Repository map (what to open in the IDE)

```text
quickstar-ai/
├── package.json              # Root scripts: check, lint, test, build
├── pnpm-workspace.yaml       # Declares packages/* and services/*
├── pnpm-lock.yaml            # Locked dependency graph (commit this)
├── tsconfig.base.json        # Shared strict TypeScript defaults
├── services/
│   ├── _template/            # Slot 01 pattern — DO NOT deploy as production
│   ├── identity-service/     # Slot 04+ (example of copied template)
│   └── …
├── packages/
│   ├── contracts/            # Shared types (HealthResponse, permissions, …)
│   ├── http-server/          # createPlatformApp, createApiRouter
│   ├── errors/, logging/, tracing/, auth/, utilities/
│   └── workspace-access/     # Later feature (09B) — not Slot 01
├── docs/
│   ├── roadmap.md
│   ├── adr/
│   └── guides/               # You are here
├── docker-compose.yml        # Slot 02 data plane (not required for Slot 01 lab)
└── Makefile                  # make up, smoke — Slot 02+
```

**Rule:** Product logic lives in **`services/<domain>`**. Anything used by **two or more services** tends to move to **`packages/*`** — but only one person edits a given package per day (roadmap §3).

---

## 7. pnpm workspaces (how the monorepo runs)

File: `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "services/*"
```

- **`pnpm install`** at the root installs all workspaces and links `workspace:*` dependencies.
- **`pnpm --filter @quickstart/service-template build`** builds one package.
- **`pnpm -r run build`** runs `build` in every workspace that defines it (root `package.json` script).

Template `package.json` name: **`@quickstart/service-template`**.

Dependency example:

```json
"@quickstart/contracts": "workspace:*"
```

That means: resolve to the local `packages/contracts` folder, not npmjs.com.

**Checkpoint:** From repo root, run `pnpm install` then `pnpm check`. If it fails, fix Node version (need **22+**) before continuing.

---

## 8. Root quality gate — `pnpm check`

From root `package.json`:

```text
check = lint → build → typecheck → test
```

| Script | What it does |
| --- | --- |
| `lint` | ESLint + Prettier check on the whole repo |
| `build` | `pnpm -r run build` — TypeScript compile to `dist/` per package |
| `typecheck` | `tsc --noEmit` per package |
| `test` | Node test runner per package (template tests compiled JS in `dist/`) |

This is the **same shape CI will use** (Slot P7). Slot 01 establishes the habit: **no merge if `pnpm check` is red**.

---

## 9. Anatomy of `services/_template`

### 9.1 File roles

| Path | Role |
| --- | --- |
| `src/index.ts` | Entry: tracing init, `createAppServer`, listen, **graceful shutdown** |
| `src/http/create-server.ts` | Builds Express app via `createPlatformApp` |
| `src/http/context.ts` | Per-service HTTP context (`logger`, `serviceName`, `port`) |
| `src/http/routes/index.ts` | Lists route modules; `createTemplateApiRouter` |
| `src/http/routes/health.routes.ts` | **`GET /healthz`** and `/health` |
| `src/http/routes/demo.routes.ts` | Slot 03 demos (errors, outbound fetch) |
| `src/index.test.ts` | HTTP tests against in-memory server |
| `openapi.yaml` | Contract stub for future OpenAPI alignment |
| `Dockerfile` | Multi-stage image; build context = **monorepo root** |

### 9.2 Service name constant

`SERVICE_NAME = "service-template"` appears in health JSON and logs. Real services use their domain name (`identity-service`, `runtime-service`, …).

### 9.3 `HealthResponse` contract

Defined in `packages/contracts`:

```ts
export type HealthResponse = {
  status: "ok";
  service: string;
};
```

Health routes import this type so **gateway and probes** see a stable JSON shape across services.

---

## 10. HTTP stack — middleware order (memorize)

From `packages/http-server/src/create-platform-app.ts`:

```text
request id → tracing → timeout → JSON body → rate limit → apiRouter → 404 → platform errors
```

Why each layer exists at **service** level (even when gateway exists later):

| Layer | Purpose |
| --- | --- |
| Request ID | Correlate logs/traces across hops |
| Tracing | OpenTelemetry spans (exports when collector is up — Slot 02) |
| Timeout | Kill hung handlers so workers free up |
| JSON limit | Reject huge bodies before business logic |
| Rate limit | Safety when gateway is bypassed (local dev on `:3001`) |
| 404 / errors | One JSON error envelope everywhere |

Gateway (Slot 06) adds **JWT, tenant, edge rate limits** in front — see [http-layers.md](../architecture/http-layers.md).

**`/healthz` is skipped** by template rate limit config so probes are not throttled.

---

## 11. Route module pattern (how every service adds APIs)

Pattern used in `_template` and copied everywhere:

1. Define **`TemplateHttpContext`** (or `IdentityHttpContext`, …) with `logger`, config, clients.
2. Each file exports **`createXxxRoutes: RouteModule<Context>`** returning a small Express router.
3. **`createApiRouter(context, [module1, module2, …])`** merges modules.
4. **`createPlatformApp({ logger, apiRouter })`** mounts the stack.

Adding a new endpoint in a new service means: **new route module file**, register in `routes/index.ts` — not a giant `app.get` list in `index.ts`.

**Scale note:** At 10k HTTP req/s you still use this pattern; you scale **replicas** of the same process, not bigger route files.

---

## 12. Server lifecycle (`src/index.ts`)

Important details for cloud:

```ts
app.listen(port, "0.0.0.0", ...)
```

- **`0.0.0.0`** — listen on all interfaces (required in Docker/K8s/Contabo).
- **`PORT` env** — platforms inject port (Render, etc.); default `3000` locally.

Shutdown on **SIGINT / SIGTERM**:

1. `server.close()` — stop accepting new connections.
2. `shutdownTracing()` — flush spans.

**Production gap (honest):** Slot 01 template does not drain long requests for 30 minutes like voice (roadmap P3). HTTP services add **readiness** later; healthz is **liveness** “process is up.”

---

## 13. Hands-on lab (do this in order)

### Lab A — Install and check

```bash
cd /path/to/quickstar-ai
pnpm install
pnpm check
```

Write down which step failed if anything breaks (Node version, native deps, etc.).

### Lab B — Build and run template only

```bash
pnpm --filter @quickstart/contracts build
pnpm --filter @quickstart/service-template build
PORT=3099 pnpm --filter @quickstart/service-template start
```

Another terminal:

```bash
curl -s http://127.0.0.1:3099/healthz | jq .
# Expected: { "status": "ok", "service": "service-template" }
```

### Lab C — Error envelope (Slot 03 preview)

```bash
curl -s http://127.0.0.1:3099/unknown | jq .
curl -s http://127.0.0.1:3099/demo/error | jq .
```

Confirm: `error.code`, `error.request_id` present on failures.

### Lab D — Run template tests

```bash
pnpm --filter @quickstart/service-template test
```

Read `src/index.test.ts` and map each test to a production concern (health, 404, validation).

### Lab E — Optional traces (needs Slot 02)

```bash
make up   # starts OTel collector among other things
# set OTEL_EXPORTER_OTLP_ENDPOINT if documented in .env.example
# hit /demo/outbound and find trace in collector UI / logs
```

---

## 14. Trace exercise (paper or debugger)

Follow **`GET /healthz`** without running a debugger first:

1. `node dist/index.js` → `startServer()` → `initTracing` → `createAppServer()`.
2. `createAppServer` → `createTemplateApiRouter` → `createHealthRoutes`.
3. Request hits `createPlatformApp` middleware chain.
4. `health.routes.ts` handler → `sendPlatformJson` with `HealthResponse`.

Then answer: **Where would you add a new `GET /version` route?** (Expected: new `version.routes.ts` + register in `routes/index.ts`.)

---

## 15. Docker image (how deploy sees Slot 01)

`services/_template/Dockerfile`:

- **Build context = monorepo root** (copies `packages/` + one service).
- Multi-stage: deps → build all referenced workspaces → runtime CMD `node dist/index.js`.
- **`NODE_ENV=production`**, **`EXPOSE 3000`**.

Real services copy this pattern with their path instead of `_template`. Slot **P1** (roadmap) generalizes images for all services.

**Important:** Ephemeral disk on PaaS — same as Render docs: do not store tenant data on container filesystem.

---

## 16. What breaks at scale (Slot 01 lens)

Slot 01 alone does not handle 10k RPS — it **enables** services that will. Still ask:

| Question | Slot 01 answer |
| --- | --- |
| Two gateway copies? | Template rate limit uses config; gateway uses Redis later — **in-memory Map breaks** |
| Health check storm? | `/healthz` excluded from rate limit in template |
| Wrong bind address? | Service “runs” in container but load balancer gets connection refused |
| No `request_id`? | Platform middleware adds it — do not bypass `sendPlatformJson` / `AppError` |

---

## 17. Identity and trust (Slot 01)

Slot 01 has **no tenants, no JWT, no users**. Trust boundaries start Slot 04 (identity) and Slot 06 (gateway).

Demo route calls `extractAuthContext` only to show **header parsing** — there is no login yet. Never treat `userId` in JSON body as authoritative (ADR 0003).

---

## 18. How other services relate (copy pattern)

Every `services/*` (except `_template`) is a **copy-evolve** of the template:

| Service | Slot | Same pattern as template |
| --- | --- | --- |
| `identity-service` | 04 | `createAppServer`, route modules, healthz |
| `gateway-service` | 06 | Plus proxy routes to internal URLs |
| `runtime-service` | 12 | Plus turn handler, internal clients |

When you open `identity-service`, find **`create-server.ts`**, **`routes/`**, **`health.routes.ts`** — you are seeing Slot 01 repeated with domain code.

---

## 19. Self-check (answer in full sentences)

1. What is the difference between `services/_template` and `services/identity-service` in terms of **deploy**?  
2. Why does ADR 0001 reject a polyrepo for this team?  
3. What does `pnpm -r run build` do?  
4. List the middleware order in `createPlatformApp`.  
5. Why is `GET /healthz` excluded from rate limiting in the template?  
6. What JSON does `curl /healthz` return and which package defines the type?  
7. What happens on SIGTERM if you skip `server.close()`?  
8. What is the next roadmap slot after 01 and what does it add?  
9. Name two things Slot 01 intentionally does **not** include.  
10. Where would you document a new architectural choice for Slot 02?

---

## 20. Done when (Slot 01 mastery)

You are done with Slot 01 when:

- [ ] `pnpm check` passes on your machine.  
- [ ] You ran template on a port and hit `/healthz`.  
- [ ] You explained the route module pattern to someone (or aloud) without opening `identity-service`.  
- [ ] You read ADR 0001 once.  
- [ ] You can add a stub `GET /version` route in `_template` **on a branch** (exercise only — do not merge unless assigned).  

---

## 21. Still unsafe after Slot 01

These are normal; later slots address them:

- No authentication, no multi-tenant data.  
- No database migrations in Slot 01.  
- Demo outbound HTTP calls `127.0.0.1` — fine for laptop, not service discovery.  
- Single process — no readiness vs liveness split for Kubernetes (labs P2–P3).  

---

## 22. Next step in the learning path

| Order | Guide / doc |
| --- | --- |
| Done | [learning-from-zero.md](./learning-from-zero.md) |
| **You are here** | Slot 01 — this file |
| Next | Slot 02 — [local-data-plane.md](../architecture/local-data-plane.md) + `make up` / `make smoke` |
| Then | Slot 03 — [ADR 0003](../adr/0003-platform-libraries.md) + re-read `demo.routes.ts` |
| Then | Slot 04 — identity ADR + `services/identity-service` |

---

## 23. Quick reference card

```text
Slot 01     = monorepo + _template + healthz + pnpm check
Copy rule   = new service from services/_template
Public probe= GET /healthz → { status, service }
Bind        = 0.0.0.0:$PORT
App factory = createPlatformApp + createApiRouter + RouteModules
ADR         = docs/adr/0001-monorepo-and-service-boundaries.md
```

---

*Aligned with repo layout and ADR 0001. Template includes Slot 03 demos; learn health + lifecycle first, then platform libraries as Slot 03.*
