# QuickStart AI — 60-Day Production Roadmap

This file is the **execution plan and progress tracker** for rebuilding QuickStart AI from scratch.

Source of truth for *what* we are building: [`docs/project_details.md`](./project_details.md).  
This file is the source of truth for *when*, *in what order*, *what we learn first*, *which approach we take*, and *whether a day is done*.

Do not treat this as a backlog of optional ideas. Treat it as the calendar.

---

## How to use this file

Update this file at the end of every workday.

1. Set **Current day** and **Current slot** at the top of the Progress Board.
2. Change that day's `Status` to `in_progress` when you start, `done` when the Definition of Done is met, or `blocked` if you cannot finish.
3. Check off the day's task boxes.
4. Fill **End-of-day notes** with what shipped, what slipped, and what the next day must know.
5. Never skip ahead to a later slot because a later feature "sounds more important." Later slots assume earlier ones exist.

### Status values

| Status | Meaning |
| --- | --- |
| `not_started` | Have not opened this day yet |
| `in_progress` | Today is this day |
| `done` | Definition of Done is met, not merely "code exists" |
| `blocked` | Cannot finish; write the blocker in the day's notes |
| `slipped` | Started but not done; must finish before the next build day in the same slot |

A **slot** is two consecutive days: one learning day, then one building day. Do not start Slot N+1 while Slot N is `slipped` unless the leftover work is explicitly parked in that slot's notes.

---

## Operating rules

### Time

- Calendar: **60 straight days**. No rest days in the plan.
- Daily window: **6 hours of focused work**.
- Total capacity: **360 hours**.
- Cadence: **odd day = learn**, **even day = build**.
- Learning day output is not "I watched videos." It is a written ADR, a build-day LLD, and a spike if the approach is unproven.
- Building day output is production-minded code: tenant-safe, tested on the critical path, observable, and documented enough that tomorrow's slot can start without rediscovering today.

### How each 6-hour learning day is spent

| Block | Time | Work |
| --- | --- | --- |
| 1 | 0:00–0:45 | Re-read the listed `project_details.md` sections and the previous slot's ADR/LLD. Write "Already in place" in your notes so you do not rebuild it. |
| 2 | 0:45–2:30 | Study the listed approaches. For each approach: what problem it solves, failure modes, operational cost, and fit for *this* slot. |
| 3 | 2:30–3:30 | Write the ADR for this slot: approaches considered, chosen approach, why the others lost. |
| 4 | 3:30–5:00 | Practical spike: one small working proof (local command, API call, schema sketch, or failing-then-passing test). No product feature work. |
| 5 | 5:00–6:00 | Write tomorrow's LLD: files, APIs, tables, events, tests, and the exact Definition of Done. Mark this learning day `done`. |

### How each 6-hour building day is spent

| Block | Time | Work |
| --- | --- | --- |
| 1 | 0:00–0:30 | Read yesterday's ADR + LLD. Do not redesign unless the LLD is wrong; if it is wrong, fix the ADR first in 15 minutes and continue. |
| 2 | 0:30–4:00 | Implement the slot with aggressive AI help. Keep the human in charge of boundaries, tenancy, failure behavior, and API shape. |
| 3 | 4:00–5:15 | Tests: happy path, tenant isolation, one failure/retry/timeout case. No "we'll test later." |
| 4 | 5:15–6:00 | Tracing/logging hooks, README/ADR link, progress checkboxes, commit. Mark the build day `done` only if Definition of Done is met. |

### AI usage

Use AI aggressively for boilerplate, tests, clients, Terraform, docs, and first-pass implementations.

Do **not** outsource these decisions to AI:

- service boundaries
- consistency model
- tenant isolation
- what happens when a dependency fails
- whether a request is sync or async
- whether data belongs in Postgres, Redis, S3, OpenSearch, Kafka, or SQS

If you cannot answer those questions in plain language before generating code, you are still on the learning day.

### Production bar for every build day

Every service or feature that ships in a build day must include:

- tenant_id on every persisted record that is tenant-owned
- request_id / trace_id propagation
- bounded timeouts on every network call
- structured errors, not raw provider errors to clients
- at least one automated test that would fail if Tenant A could read Tenant B
- logs that do not print secrets or raw PII
- an explicit "what happens when X fails" note in the slot ADR

### What "the whole project in 60 days" means

This plan covers the **full product and architecture in `project_details.md`**, built incrementally, at production engineering quality for a small team using AI every day.

It does **not** mean:

- a year of production hardening compressed into silence
- every AWS service tuned for 1,000 RPS on day 60
- a giant rewrite in week 8

It **does** mean:

- every major domain exists as a real service with a real boundary
- chat, knowledge, tools, inbox, events, workflows, voice, campaigns, leads, eval, usage/billing, and audit all work on one tenant-safe platform
- local development is complete and daily
- Terraform/EKS/CI exist and can deploy a staging-like environment
- critical failure modes are implemented and tested, not only described
- SDKs, runbooks, ADRs, and the progress board are current

If a slot starts to explode into a redesign of earlier work, stop. The earlier slot was incomplete. Finish that repair in the earlier slot's notes, then continue.

---

## How the 60 days connect

Read this once. Each later slot will repeat only the local connection, not this whole story.

```text
Foundation
  repo, local data plane, shared libraries
    ↓
Access
  identity → workspace/tenancy → API gateway
    ↓
Core objects
  agent → versioning → conversation
    ↓
A working agent
  model gateway → runtime (LLM reply over a conversation)
    ↓
Smarter agent
  knowledge ingest → retrieval in runtime → memory
    ↓
An agent that can act
  tools/MCP → secrets
    ↓
First real channel
  website widget
    ↓
Operations
  inbox + human handoff
    ↓
Nervous system
  events → workflows
    ↓
Second channel
  voice path → voice reliability
    ↓
Growth systems
  campaigns → leads
    ↓
Quality and money
  evaluation → usage/cost → billing
    ↓
Hardening and ship
  audit/security → observability/alerts → AWS/EKS/CI → load/failure/DR/SDKs
```

Rules that keep this from becoming a rewrite:

- The runtime starts answering without RAG or tools. Later slots **add stages** to the same loop. They do not replace the runtime.
- Voice is a new **channel** into the same runtime. It is not a second agent engine.
- Campaigns call the voice/conversation systems. They do not invent a parallel caller.
- Events are emitted from domain services after those services exist. We do not build Kafka consumers for objects we have not created.
- Terraform/EKS come late **on purpose**. Local Docker is the daily environment. Cloud work deploys what already exists.

---

## Progress Board

Update the three lines below every day.

- **Current day:** Day 1
- **Current slot:** Slot 01 — Engineering foundation
- **Overall progress:** 0 / 60 days (0%)

| Slot | Days | Theme | Learn | Build | Status |
| --- | --- | --- | --- | --- | --- |
| 01 | 1–2 | Engineering foundation | [ ] | [ ] | `not_started` |
| 02 | 3–4 | Local data plane | [ ] | [ ] | `not_started` |
| 03 | 5–6 | Shared platform libraries | [ ] | [ ] | `not_started` |
| 04 | 7–8 | Identity | [ ] | [ ] | `not_started` |
| 05 | 9–10 | Workspace and tenancy | [ ] | [ ] | `not_started` |
| 06 | 11–12 | API gateway | [ ] | [ ] | `not_started` |
| 07 | 13–14 | Agent service | [ ] | [ ] | `not_started` |
| 08 | 15–16 | Agent lifecycle and versions | [ ] | [ ] | `not_started` |
| 09 | 17–18 | Conversation service | [ ] | [ ] | `not_started` |
| 10 | 19–20 | Model gateway | [ ] | [ ] | `not_started` |
| 11 | 21–22 | Agent runtime | [ ] | [ ] | `not_started` |
| 12 | 23–24 | Knowledge ingestion | [ ] | [ ] | `not_started` |
| 13 | 25–26 | Retrieval in the runtime | [ ] | [ ] | `not_started` |
| 14 | 27–28 | Memory | [ ] | [ ] | `not_started` |
| 15 | 29–30 | Tools and MCP | [ ] | [ ] | `not_started` |
| 16 | 31–32 | Secrets | [ ] | [ ] | `not_started` |
| 17 | 33–34 | Website chat widget | [ ] | [ ] | `not_started` |
| 18 | 35–36 | Inbox and human handoff | [ ] | [ ] | `not_started` |
| 19 | 37–38 | Event platform | [ ] | [ ] | `not_started` |
| 20 | 39–40 | Workflow automation | [ ] | [ ] | `not_started` |
| 21 | 41–42 | Voice path | [ ] | [ ] | `not_started` |
| 22 | 43–44 | Voice reliability | [ ] | [ ] | `not_started` |
| 23 | 45–46 | Campaigns | [ ] | [ ] | `not_started` |
| 24 | 47–48 | Leads | [ ] | [ ] | `not_started` |
| 25 | 49–50 | Evaluation | [ ] | [ ] | `not_started` |
| 26 | 51–52 | Usage, cost, billing | [ ] | [ ] | `not_started` |
| 27 | 53–54 | Audit and security | [ ] | [ ] | `not_started` |
| 28 | 55–56 | Observability, alerts, notifications | [ ] | [ ] | `not_started` |
| 29 | 57–58 | AWS, EKS, Terraform, CI/CD | [ ] | [ ] | `not_started` |
| 30 | 59–60 | Load, failure, DR, SDKs, closeout | [ ] | [ ] | `not_started` |

---

## Wave map

The 30 slots are grouped into six waves so you can see the week you are in without mixing it with later work.

| Wave | Days | What exists when the wave ends | What you should not start yet |
| --- | --- | --- | --- |
| A — Foundation | 1–10 | Repo, local Postgres/Redis/Kafka/OpenSearch/OTel, shared libs, identity, workspaces | Agents, chat, AWS |
| B — Core objects | 11–20 | Public API gateway, agents, versions, conversations, model gateway | Runtime replies, RAG, voice |
| C — Working agent | 21–30 | Streaming runtime, knowledge pipeline, retrieval, memory, tools/MCP | Widget, inbox, Kafka product events |
| D — Channel and operations | 31–40 | Secrets, website chat, inbox/handoff, events, workflows | Voice, campaigns, billing |
| E — Voice and growth | 41–50 | Voice calls, reliable realtime path, campaigns, leads, eval | Cloud deploy, DR |
| F — Harden and ship | 51–60 | Usage/billing, audit/security, alerts, AWS/EKS/CI, load/failure/DR, SDKs | New product domains |

---

# WAVE A — Foundation (Days 1–10)

Goal of this wave: a repo and local platform that later services can join without inventing new conventions.

---

## Slot 01 — Engineering foundation

**Days:** 1–2  
**Wave:** A  
**Status:** `not_started`  
**Reads before this slot:** `project_details.md` sections 1–3, 36, 59–61, 64–66

### Already in place

Nothing. The repo only has `docs/project_details.md` and this roadmap.

### This slot adds

The repository shape, engineering rules, and the habit of writing ADRs *before* code.

### Explicitly out of scope until later

Docker data stores (Slot 02). Auth (Slot 04). Any product API.

### Why this comes first

If we "just start coding the chat API," every later service will copy a different layout, error shape, and naming scheme. That becomes a rewrite. This slot makes later build days mechanical.

---

### Day 1 — Learn: how we will build the system

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Polyrepo (one git repo per service)**  
   Strong independent versioning. Weak for a small team: cross-service changes become many PRs and contract drift.

2. **Monolith first, split later**  
   Fastest first week. Loses the point of the project and almost always becomes an emergency rewrite around the time events and voice arrive.

3. **Monorepo with domain services plus shared packages**  
   One repo, many deployable services, shared contracts/logging/auth libraries. Matches `project_details.md` section 60.

**Chosen approach:** 3. We need real service boundaries *and* one-PR contract changes. We do not need 16 GitHub repositories.

Also decide today, and write them down:

- Language/runtime for services: **TypeScript on Node** for API/BFF and most services, unless a later voice slot proves a small Go/Python sidecar is required. One language keeps the 60-day pace honest.
- API style for public and inter-service MVP: **HTTP/JSON**. gRPC is allowed later for an internal hot path, not as the default.
- Testing default: unit tests next to code; integration tests talk to Docker dependencies.
- Branching: trunk + short-lived slot branches.
- ADR rule: one ADR per slot, stored in `docs/adr/`.

#### Learning checklist

- [ ] Read sections 1–3, 36, 59–61, 64–66
- [ ] Compare polyrepo / monolith / monorepo and write why monorepo wins *for this team and this calendar*
- [ ] Write `docs/adr/0001-monorepo-and-service-boundaries.md`
- [ ] Sketch the empty tree from section 60 (do not create fake services)
- [ ] Write Day 2 LLD: exact folders, lint/test/build commands, README, `.gitignore`, editorconfig, commit convention
- [ ] Define the service template contract: `src/`, health endpoint, Dockerfile, README, OpenAPI stub

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 2:

---

### Day 2 — Build: repo, docs skeleton, service template

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building  
**Depends on:** Day 1 ADR

#### Build checklist

- [ ] Create the monorepo root: `services/`, `packages/`, `sdk/`, `infra/`, `deploy/`, `tests/`, `docs/`
- [ ] Add `docs/adr/`, `docs/architecture/`, `docs/api/`, `docs/events/`, `docs/runbooks/`
- [ ] Add root README that points to `project_details.md` and this roadmap
- [ ] Add `.gitignore`, lint, format, typecheck, test scripts
- [ ] Add `packages/contracts` as an empty but buildable package
- [ ] Add one **example** service template under `services/_template` (healthz only). Do not create identity/agent/voice services yet.
- [ ] CI-ready local commands: `lint`, `test`, `build` run in one command
- [ ] Commit with a message that references Slot 01

#### Definition of Done

A new engineer can clone the repo, run one install command, run lint/test, and see the intended tree. No product behavior exists yet. That is correct.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 02 — Local data plane

**Days:** 3–4  
**Wave:** A  
**Status:** `not_started`  
**Reads:** sections 9, 35, 51–52

### Already in place

Repo tree, service template, ADR habit.

### This slot adds

Local stand-ins for the production data technologies, running in Docker, with health checks.

### Explicitly out of scope until later

AWS Aurora/MSK/OpenSearch domains (Slot 29). Application schemas beyond a connectivity smoke test.

### Why this comes now

Every later service needs Postgres, Redis, Kafka, OpenSearch, and an OTel collector. If we invent a database per service "for now," we will migrate for two weeks in month two.

---

### Day 3 — Learn: which store for which job

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

For **transactional data**:

1. Mongo-first — flexible documents, weak relational integrity for membership, versions, billing.
2. One Postgres for everything including vectors and events — simple, becomes the wrong tool for search and replay.
3. **Aurora PostgreSQL locally as Postgres** for users, orgs, agents, conversations, billing, permissions.

**Chosen:** 3. Transactions, constraints, and later read replicas map cleanly.

For **cache/state**:

1. In-process memory — dies with the process, useless for rate limits and locks across replicas.
2. **Redis/Valkey** for cache, sessions, rate limits, idempotency keys, locks.
3. Redis as the source of truth for conversations — fast, and you will lose data.

**Chosen:** 2. Redis is never the system of record.

For **async work**:

1. Kafka for *every* background job — replay is great; simple retries/DLQ are heavier than needed.
2. SQS-only — good for jobs, poor for many consumers replaying the same business event.
3. **Kafka for business events, SQS (or local queue compatible with SQS semantics) for jobs.**

**Chosen:** 3. Learn both. Use each for the job it is good at.

For **search/vectors**:

1. pgvector in the primary DB — fine for a demo, couples transactional load to ANN search.
2. Dedicated vector DB (Pinecone/Qdrant) plus a second search engine — two systems for one retrieval problem.
3. **OpenSearch for keyword + vector/hybrid retrieval.**

**Chosen:** 3. One search system, later used for conversation search too.

For **local orchestration**:

1. Develop only on AWS — slow feedback, violates section 52.
2. Local Kubernetes from day 3 — production-like, burns the week on YAML.
3. **Docker Compose for daily work.** Kubernetes in Slot 29.

**Chosen:** 3.

#### Learning checklist

- [ ] Write `docs/adr/0002-data-plane.md` with one paragraph per store: why it exists, what must never go there
- [ ] Decide Compose service names, ports, and volume policy (ephemeral local data is acceptable)
- [ ] Spike: start Postgres and Redis and connect with a CLI
- [ ] Write Day 4 LLD: `docker-compose.yml`, init scripts, `make up` / `make down`, smoke test

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 4:

---

### Day 4 — Build: Compose platform + connectivity smoke test

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Compose: Postgres, Redis/Valkey, Kafka (KRaft), OpenSearch, OTel Collector, local SQS-compatible (LocalStack or ElasticMQ)
- [ ] Healthchecks and a single `make up` that waits until healthy
- [ ] `make down` / `make logs`
- [ ] Smoke test script: connect to each dependency, write/read one record or message, exit non-zero on failure
- [ ] Document ports and "what each store is for" in `docs/architecture/local-data-plane.md`
- [ ] Do **not** create product tables yet

#### Definition of Done

`make up` and the smoke test pass on a clean machine. A service template can be pointed at these URLs through env vars.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 03 — Shared platform libraries

**Days:** 5–6  
**Wave:** A  
**Status:** `not_started`  
**Reads:** sections 38, 41–42, 44, 59

### Already in place

Repo + running local data plane.

### This slot adds

The libraries every service will import: errors, logging, tracing, auth context, HTTP client with timeout/retry/circuit breaker, idempotency helpers.

### Explicitly out of scope until later

Real login (Slot 04). Product metrics dashboards (Slot 28).

### Why this comes now

If Identity invents its own error JSON and Runtime invents another, the gateway cannot present one API. Reliability primitives have to exist *before* the first outbound LLM call.

---

### Day 5 — Learn: cross-cutting standards

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

**Errors**

1. Throw raw strings / provider errors.
2. Per-service error formats.
3. **Shared error codes + HTTP mapping + `request_id`.**

**Chosen:** 3.

**Tracing**

1. `console.log` correlation IDs only.
2. Vendor-specific APM agent only.
3. **OpenTelemetry traces/metrics/logs with W3C trace context.**

**Chosen:** 3. Section 44 requires this.

**Outbound HTTP**

1. Default fetch with no timeout — will hang the process.
2. Retry everything including non-idempotent POSTs — will double-charge and double-call.
3. **Client wrapper: timeout required, retry only idempotent or explicitly safe calls, exponential backoff, circuit breaker, bulkhead-ish concurrency cap.**

**Chosen:** 3.

**Auth context**

1. Pass `userId` as a query parameter between services.
2. **Trusted internal header or token carrying `tenant_id`, `actor_id`, `roles`, `request_id` — validated at the gateway, forwarded internally.**

**Chosen:** 2. Internal services must not invent their own user from the body.

#### Learning checklist

- [ ] Write `docs/adr/0003-platform-libraries.md`
- [ ] Define error envelope: `code`, `message`, `request_id`, `details`
- [ ] Define required span attributes: `trace_id`, `span_id`, `request_id`, `tenant_id`, `agent_id`, `conversation_id`
- [ ] Spike: one OTel trace from the template service to the collector
- [ ] Write Day 6 LLD for `packages/errors`, `packages/logging`, `packages/tracing`, `packages/auth`, `packages/utilities`

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 6:

---

### Day 6 — Build: shared packages

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `packages/errors` with unit tests
- [ ] `packages/logging` JSON logs, redaction helper
- [ ] `packages/tracing` OTel bootstrap
- [ ] `packages/auth` context type + extractor (no password login yet)
- [ ] `packages/utilities`: timeout, retry with backoff, circuit breaker, idempotency key helper, distributed lock wrapper around Redis
- [ ] Template service emits one traced request and uses the error envelope
- [ ] Tests for retry *not* retrying a non-idempotent failure

#### Definition of Done

Another service can depend on these packages. The template service shows a trace in the local collector. No product domain yet.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 04 — Identity

**Days:** 7–8  
**Wave:** A  
**Status:** `not_started`  
**Reads:** sections 12–13, 47

### Already in place

Shared auth *context types*, not real users.

### This slot adds

Users, password/session or token auth, API keys, the first organization, and login/register endpoints.

### Explicitly out of scope until later

Workspaces and RBAC matrix (Slot 05). Public developer API keys for agents (can start here as user/org keys, agent-scoped keys come with Agent service).

---

### Day 7 — Learn: authentication and identity models

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Fully outsourced Auth0/Clerk/Cognito as the only identity.**  
   Fast UI. Weak learning. Harder to attach service identities, fine-grained tool permissions, and audit later.

2. **Custom everything including your own crypto primitives.**  
   Unnecessary risk. Do not invent password hashing or JWT algorithms.

3. **Our Identity Service, standard primitives.**  
   We own users/orgs/membership APIs. Passwords use argon2/bcrypt. Tokens are signed JWTs or opaque sessions in Redis. Later we can *add* OIDC/SSO without replacing the service.

**Chosen:** 3. This is an identity *domain*, not a weekend login form.

Also compare:

- JWT access + rotating refresh vs server sessions only.  
  **Chosen:** short-lived access JWT + refresh token stored hashed, session metadata in Redis for revocation.
- API keys: raw storage vs **hash at rest, show once**. **Chosen:** hash at rest.

#### Learning checklist

- [ ] Write `docs/adr/0004-identity.md`
- [ ] Threat model one-pager: credential stuffing, token theft, key leak
- [ ] Spike: register/login against local Postgres in a scratch script
- [ ] Day 8 LLD: tables `users`, `organizations`, `org_memberships`, `api_keys`, `refresh_tokens`; routes; password policy

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 8:

---

### Day 8 — Build: Identity Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/identity` from the template
- [ ] Register, login, logout/refresh, me
- [ ] Create organization + first owner membership
- [ ] API key issue/revoke
- [ ] Password hashing, token revocation
- [ ] Tests: wrong password, refresh reuse, tenant/org membership cannot be guessed by IDOR
- [ ] Healthz + migrations

#### Definition of Done

You can create a user and org via API. Tokens work. Keys are hashed. Identity is a separate service, not a folder inside a future monolith.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 05 — Workspace and tenancy

**Days:** 9–10  
**Wave:** A  
**Status:** `not_started`  
**Reads:** sections 12–13, 41, 47

### Already in place

Users and organizations.

### This slot adds

Workspaces, roles, permission checks, and the rule that every later query is tenant-scoped.

### Explicitly out of scope until later

Agent RBAC for *tools* (Slot 15). Billing plans (Slot 26).

---

### Day 9 — Learn: multi-tenant isolation

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Database per tenant** — strongest isolation, operationally impossible at 10k orgs in 60 days.
2. **Schema per tenant** — medium isolation, painful migrations.
3. **Shared schema + `tenant_id` on every row, enforced in application and data-access layer.**  
   Correct for this SaaS scale if we never run a query without tenant scope.

**Chosen:** 3, with a hard rule: repositories accept `TenantContext` as a required argument, not an optional filter.

Roles to implement now (from section 13):

`Owner`, `Admin`, `Developer`, `Operator`, `Analyst`, `Human Agent`

Permission model:

1. Giant `if role === admin` trees.
2. **Permission strings (`workspace.agent.publish`) granted to roles, checked in one helper.**

**Chosen:** 2. Tool permissions later reuse the same checker.

#### Learning checklist

- [ ] Write `docs/adr/0005-tenancy-and-rbac.md`
- [ ] Define Organization vs Workspace in one paragraph so nobody treats them as the same table
- [ ] List IDOR test cases
- [ ] Day 10 LLD: tables, invite flow, role assignment, `requirePermission()`

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 10:

---

### Day 10 — Build: Workspace Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/workspace`
- [ ] Workspaces under an organization
- [ ] Members, invites, role changes
- [ ] `requirePermission` used on every mutating route
- [ ] Tests: member of Workspace A cannot read Workspace B; Analyst cannot publish (even though publish comes later, deny the permission now)
- [ ] Cross-service contract: `TenantContext` in `packages/auth`

#### Definition of Done

Tenancy is a platform rule, not a later cleanup. Wave A is complete.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

# WAVE B — Core objects (Days 11–20)

Goal of this wave: a secured public API and the objects an agent platform cannot exist without. Still no LLM replies.

---

## Slot 06 — API gateway / BFF

**Days:** 11–12  
**Wave:** B  
**Status:** `not_started`  
**Reads:** sections 5, 36–38, 47

### Already in place

Identity and workspace APIs as separate services.

### This slot adds

One public entry: authn, authz context, rate limits, request IDs, routing to internal services.

### Explicitly out of scope until later

AWS API Gateway/ALB (Slot 29). GraphQL. A second public API for widgets can be a route group here, not a new gateway.

---

### Day 11 — Learn: how clients enter the system

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Browser talks to every microservice** — CORS and auth explode; tenants leak across forgotten endpoints.
2. **Service mesh only (no BFF)** — useful later inside EKS, does not replace a public facade.
3. **API Gateway / BFF service** — session/JWT validation, rate limit, compose calls, hide internal URLs.

**Chosen:** 3.

Rate limiting:

1. In-memory per process — wrong under multiple replicas.
2. **Redis sliding window / token bucket keyed by IP, user, and API key.**

**Chosen:** 2.

Sync vs async reminder for the gateway: the gateway is synchronous. It may *enqueue* work, but the client's first hop is HTTP.

#### Learning checklist

- [ ] Write `docs/adr/0006-api-gateway.md`
- [ ] Define public URL map: `/v1/auth`, `/v1/workspaces`, later `/v1/agents`
- [ ] Spike: gateway validates a JWT and calls identity `/me`
- [ ] Day 12 LLD: middleware order (request_id → timeout → auth → tenant → rate limit → route)

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 12:

---

### Day 12 — Build: gateway

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services` gateway or `apps/bff` — one public HTTP server bound later to `0.0.0.0:$PORT` for cloud
- [ ] Proxy/compose to identity and workspace
- [ ] Rate limits with Redis
- [ ] 429 and 401/403 in the shared error envelope
- [ ] Tests: missing token, invalid token, rate limit trip, request_id returned
- [ ] OpenAPI start in `docs/api/`

#### Definition of Done

All external clients use the gateway. Internal services are not exposed.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 07 — Agent service

**Days:** 13–14  
**Wave:** B  
**Status:** `not_started`  
**Reads:** sections 10, 14

### Already in place

A workspace that can own things.

### This slot adds

The Agent as the core product object: identity, instructions, model settings, environment, channel flags (config only).

### Explicitly out of scope until later

Version publish/rollback (Slot 08). Runtime execution (Slot 11). Knowledge attachments (Slot 12).

---

### Day 13 — Learn: the Agent aggregate

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Agent as a JSON blob column** — quick, cannot query or version safely.
2. **Agent as a workflow graph editor first** — delays the core object; we are not building n8n on day 13.
3. **Agent aggregate with explicit fields** matching section 10, stored relationally, config JSON only for truly open-ended model parameters.

**Chosen:** 3.

Environment:

1. One agent row mutated in production.  
2. **`environment` on the agent plus later immutable versions.** Start with `draft` environment on the mutable working copy.

**Chosen:** 2, completed in Slot 08.

#### Learning checklist

- [ ] Write `docs/adr/0007-agent-aggregate.md`
- [ ] List fields we store now vs later (knowledge IDs later, tools later)
- [ ] Day 14 LLD: CRUD, unique name per workspace, optimistic concurrency (`updated_at` or version number)

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 14:

---

### Day 14 — Build: Agent Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/agent`
- [ ] Create/read/update/list/archive agents in a workspace
- [ ] Fields: name, description, instructions, model, temperature/config, environment, channel enablement flags
- [ ] Gateway routes `/v1/agents`
- [ ] Tests: cross-tenant deny, validation, archive vs delete
- [ ] Cache-aside *read* of agent config in Redis with short TTL and explicit invalidation on update (do not cache as source of truth)

#### Definition of Done

A workspace can manage agents. Nothing runs them yet.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 08 — Agent lifecycle and versions

**Days:** 15–16  
**Wave:** B  
**Status:** `not_started`  
**Reads:** section 11, 41

### Already in place

Mutable agent records.

### This slot adds

Draft → testing → staging → production, immutable published versions, rollback, audit fields for publish.

### Explicitly out of scope until later

Runtime pinning (Slot 11 will *read* the published version). Eval gates on publish (Slot 25 can hook later).

---

### Day 15 — Learn: versioning without rewriting agents

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Overwrite the agent row and hope** — cannot rollback, cannot compare, cannot audit.
2. **Git-like repo per agent** — powerful, overkill, poor queryability.
3. **Immutable `agent_versions` rows; production pointer on the agent.**  
   Publish copies current draft config into a version. Rollback moves the pointer. Draft remains editable.

**Chosen:** 3. Strong consistency on publish (section 41).

Compare-and-publish:

- Require `base_version` to avoid two developers publishing stale drafts.

#### Learning checklist

- [ ] Write `docs/adr/0008-agent-versioning.md`
- [ ] Draw the state machine
- [ ] Day 16 LLD: publish, rollback, list versions, diff endpoint

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 16:

---

### Day 16 — Build: versions

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Version table, immutable after insert
- [ ] Publish / rollback / list / get / diff
- [ ] Production pointer
- [ ] Tests: rollback restores pointer; published row cannot be updated; cannot publish with stale `base_version`
- [ ] Write-through to writer DB; document that "read-after-publish" uses the primary, not a replica

#### Definition of Done

Production is a pointer to an immutable version. This is the last Agent-service change before the runtime consumes it.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 09 — Conversation service

**Days:** 17–18  
**Wave:** B  
**Status:** `not_started`  
**Reads:** sections 6, 21

### Already in place

Agents. Still no messages from a model.

### This slot adds

Conversations, messages, participants, session state. Storage for history the runtime will append to.

### Explicitly out of scope until later

Handoff/inbox (Slot 18). Widget (Slot 17). Search index backfill can be a stub.

---

### Day 17 — Learn: conversation as a durable log

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Store chat only in Redis** — low latency, not durable, not searchable.
2. **Store chat only in the LLM provider** — we do not own history or handoff.
3. **Conversation Service owns conversations/messages in Postgres; Redis may hold active-session cursors only.**

**Chosen:** 3.

Message append:

1. Update a big JSON array — lost updates, huge rows.
2. **Append-only `messages` table, ordered by `seq` or timestamp+id.**

**Chosen:** 2.

#### Learning checklist

- [ ] Write `docs/adr/0009-conversations.md`
- [ ] Define states: `active`, `waiting_human`, `resolved`, `failed`
- [ ] Day 18 LLD: create conversation, append message, list history, pagination

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 18:

---

### Day 18 — Build: Conversation Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/conversation`
- [ ] Create conversation bound to workspace + agent version
- [ ] Append user/assistant/system/tool messages
- [ ] List with pagination
- [ ] Participants table (customer, ai, later human)
- [ ] Tests: cannot append to another tenant's conversation; sequence stays monotonic
- [ ] Gateway routes

#### Definition of Done

History exists independently of the LLM. Runtime will write here, not invent its own store.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 10 — Model gateway

**Days:** 19–20  
**Wave:** B  
**Status:** `not_started`  
**Reads:** sections 17, 32, 38

### Already in place

Nothing that talks to an LLM yet. That is intentional.

### This slot adds

Provider abstraction, timeouts, retries, fallback, token/cost accounting hooks.

### Explicitly out of scope until later

The agent loop (Slot 11). Billing invoices (Slot 26) — only emit usage records or a usage port.

---

### Day 19 — Learn: do not couple to one vendor

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Call OpenAI/Groq/Anthropic directly from the runtime** — the first outage becomes a rewrite.
2. **LiteLLM or a hosted proxy as the product** — useful adapter, but we still need *our* policy, tenancy, and cost records.
3. **Our Model Gateway service** with a provider interface. Internally it may use an SDK or LiteLLM-style adapter, but the platform boundary is ours.

**Chosen:** 3.

Fallback:

1. Fail the user immediately.
2. Retry same model forever.
3. **Timeout → retry once if safe → fallback model if configured → fail with a typed error.**

**Chosen:** 3.

#### Learning checklist

- [ ] Write `docs/adr/0010-model-gateway.md`
- [ ] List providers we will support first (start with two, not ten)
- [ ] Spike: one streaming and one non-streaming completion through a provider
- [ ] Day 20 LLD: `complete`, `stream`, usage callback, provider errors mapped

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 20:

---

### Day 20 — Build: Model Gateway

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/model-gateway`
- [ ] Provider interface + two providers
- [ ] Timeouts, limited retries, fallback
- [ ] Token usage recorded (table or port for Slot 26)
- [ ] Tests: provider timeout triggers fallback; unknown model 400; API key never logged
- [ ] No tenant data stored in provider-specific logs

#### Definition of Done

Runtime can depend on one internal API for models. Wave B is complete. Tomorrow we make an agent talk.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

# WAVE C — Working agent (Days 21–30)

Goal of this wave: a tenant can run a versioned agent over a conversation, with knowledge, memory, and tools. Still no public widget.

---

## Slot 11 — Agent runtime

**Days:** 21–22  
**Wave:** C  
**Status:** `not_started`  
**Reads:** section 16

### Already in place

Agent versions, conversations, model gateway.

### This slot adds

The execution loop: load config → load history → call model → stream tokens → persist assistant message.

### Explicitly out of scope until later

Retrieval (Slot 13), tools (Slot 15). Leave **interfaces** (ports) for them so we do not rewrite the loop.

---

### Day 21 — Learn: a runtime we can extend

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **LangChain/LangGraph as the runtime.** Fast graphs; we lose control of cancellation, tenancy, and tracing unless we wrap heavily. High rewrite risk.
2. **One giant prompt function in the API process.** Works today, cannot isolate concurrency or scale independently.
3. **Our Agent Runtime service** with a fixed pipeline of stages. Each later slot adds a stage (retrieve, remember, tools) behind an interface.

**Chosen:** 3.

Streaming:

1. Buffer the full answer — feels dead on chat and voice.
2. **SSE or response streaming from runtime through gateway to client; persist final message at end (and optionally checkpoint tokens).**

**Chosen:** 2.

Concurrency: per-tenant and per-agent limits in Redis so one customer cannot starve the LLM budget.

#### Learning checklist

- [ ] Write `docs/adr/0011-agent-runtime.md`
- [ ] Draw the loop with empty ports: `Retriever`, `MemoryStore`, `ToolExecutor`
- [ ] Spike: stream tokens from model gateway to a curl client
- [ ] Day 22 LLD: `run` and `stream` APIs, cancellation, context window trim

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 22:

---

### Day 22 — Build: Runtime Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/runtime`
- [ ] Load published or specified agent version
- [ ] Load conversation history
- [ ] Call model gateway
- [ ] Stream to caller; persist final assistant message
- [ ] Timeouts, cancellation, simple context trim
- [ ] Tests: uses published version not stale draft; other tenant conversation rejected; timeout returns typed error
- [ ] Gateway: `POST /v1/conversations/:id/messages` streams

#### Definition of Done

An authenticated user can have a real multi-turn chat with a production agent version. No RAG. No tools. This is the spine.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 12 — Knowledge ingestion

**Days:** 23–24  
**Wave:** C  
**Status:** `not_started`  
**Reads:** sections 15, 35, 37

### Already in place

Agents that answer from instructions only.

### This slot adds

Sources → parse → chunk → embed → index. Async jobs. Status and retries. **Does not yet change answers.**

### Explicitly out of scope until later

Retrieval in the loop (Slot 13). Website crawl polish can be minimal but real.

---

### Day 23 — Learn: the ingestion pipeline

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Embed on the request thread** — will time out on PDFs.
2. **In-process background threads** — die with the pod, no DLQ.
3. **Knowledge Service + SQS jobs + DLQ + status on the source.**

**Chosen:** 3. Section 37: document processing is asynchronous.

Chunking:

1. Fixed character slices only.
2. **Structure-aware chunking (headings/pages) + overlap + metadata (source_id, tenant_id).**

**Chosen:** 2.

Embeddings go to **OpenSearch**, not Postgres.

Deletion: chunks must die when the source is deleted (deletion propagation).

#### Learning checklist

- [ ] Write `docs/adr/0012-knowledge-ingestion.md`
- [ ] Spike: parse a PDF and a URL, chunk, embed one batch
- [ ] Day 24 LLD: source types, job states (`queued`, `processing`, `ready`, `failed`), retry policy

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 24:

---

### Day 24 — Build: Knowledge Service (ingest)

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/knowledge`
- [ ] Upload/text/URL sources stored in S3-compatible local storage (MinIO or filesystem *only* if you also document the S3 interface; prefer MinIO in Compose)
- [ ] Job worker from SQS
- [ ] Chunk + embed + index with `tenant_id` in every document
- [ ] Re-index and delete-propagation
- [ ] Tests: failed parse → retry → DLQ; deleted source removes chunks; tenant filter field always set
- [ ] Agent can be *linked* to knowledge collections (link table only)

#### Definition of Done

Documents become searchable index records. The runtime still does not retrieve them. That is the next slot, not a surprise rewrite.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 13 — Retrieval in the runtime

**Days:** 25–26  
**Wave:** C  
**Status:** `not_started`  
**Reads:** section 15–16

### Already in place

An index and a runtime with a `Retriever` port.

### This slot adds

Hybrid retrieve → rerank → citations into the existing loop.

### Explicitly out of scope until later

Eval of retrieval quality (Slot 25). Conversation search UI.

---

### Day 25 — Learn: retrieval that can be explained

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Stuff the whole corpus into the prompt** — dies at real document volume.
2. **Vector-only kNN** — misses exact tokens (order IDs, SKUs).
3. **Hybrid lexical + vector, then rerank, then bounded context, with citations.**

**Chosen:** 3.

Tenant filter is a **hard filter**, not a prompt instruction.

#### Learning checklist

- [ ] Write `docs/adr/0013-retrieval.md`
- [ ] Spike: hybrid query + rerank on a tiny corpus
- [ ] Day 26 LLD: runtime stage, citation schema, debug retrieve endpoint

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 26:

---

### Day 26 — Build: retrieve stage

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Implement `Retriever` in knowledge service
- [ ] Runtime calls retrieve when the agent has collections
- [ ] Citations on the assistant message
- [ ] Debug retrieve API for operators
- [ ] Tests: Tenant A query cannot return Tenant B chunks even if vectors are close; agent with no collections skips retrieve

#### Definition of Done

Answers can use company knowledge. The loop is the same loop as Slot 11 plus one stage.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 14 — Memory

**Days:** 27–28  
**Wave:** C  
**Status:** `not_started`  
**Reads:** section 20

### Already in place

Knowledge (org facts) and conversation history (short-term state).

### This slot adds

Long-term memory that is *not* a document and *not* the full transcript.

### Explicitly out of scope until later

A new vector product. Reuse OpenSearch or Postgres with a memory schema.

---

### Day 27 — Learn: three stores, three jobs

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Treat memory as more RAG documents** — pollutes retrieval with "user likes dark mode."
2. **Dump summaries into the system prompt forever** — unbounded, stale, no consent/delete.
3. **Separate long-term memory records** per customer/agent: write policies, TTL, retrieval of a few relevant memories, user/workspace delete.

**Chosen:** 3.

Short-term state stays in Conversation Service (+ optional Redis cursor).  
Knowledge stays in Knowledge Service.  
Do not merge the three tables.

#### Learning checklist

- [ ] Write `docs/adr/0014-memory.md`
- [ ] Define extract-on-turn vs explicit "remember this"
- [ ] Day 28 LLD: memory table, retrieve-k, write after turn, forget API

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 28:

---

### Day 28 — Build: memory stage

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Memory records with tenant + customer + agent keys
- [ ] Runtime stage: read memories, optionally write new ones
- [ ] Forget/list APIs
- [ ] Tests: memories do not leak across tenants or customers; knowledge delete does not wipe memory and vice versa

#### Definition of Done

The three storage problems are visibly separate in code and docs.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 15 — Tools and MCP

**Days:** 29–30  
**Wave:** C  
**Status:** `not_started`  
**Reads:** sections 18, 13 (tool permissions)

### Already in place

A runtime that can talk and retrieve. It cannot act.

### This slot adds

A common tool interface, internal tools, HTTP tools, MCP tools, permission checks, timeouts.

### Explicitly out of scope until later

Secrets backend (Slot 16) — tools may reference secret *ids* only. Real CRM writes can be stubbed with one real HTTP tool.

---

### Day 29 — Learn: tools as a platform, not if-else

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Hardcode `if (name === "create_lead")` in the runtime** — every new tool is a runtime deploy.
2. **Let the model call any URL** — prompt injection becomes RCE/data exfiltration.
3. **Tool / Integration Service:** registered tools with name, description, JSON schema, auth ref, permissions, timeout, retry policy. Runtime only executes allow-listed tools for that agent version.

**Chosen:** 3.

MCP is a **tool transport**, not a second permission system.

#### Learning checklist

- [ ] Write `docs/adr/0015-tools.md`
- [ ] Permission examples: `read_customer` allowed, `issue_large_refund` denied
- [ ] Spike: one MCP tool and one HTTP tool
- [ ] Day 30 LLD: register, execute, audit log line, schema validation

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 30:

---

### Day 30 — Build: Tool Service + runtime tool loop

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/tools`
- [ ] Register/list tools; attach to agent version
- [ ] Execute with schema validation, timeout, permission check
- [ ] Runtime: model tool call → execute → model → answer (same loop, new stage)
- [ ] Tests: denied permission never fires; invalid JSON never hits HTTP; tenant A tool not callable by tenant B
- [ ] MCP adapter for at least one server

#### Definition of Done

Wave C complete: a production agent can use knowledge, memory, and tools. No public website widget yet.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

# WAVE D — Channel and operations (Days 31–40)

Goal of this wave: customers can chat on a website, humans can take over, and the platform grows a real event/workflow backbone.

---

## Slot 16 — Secrets

**Days:** 31–32  
**Wave:** D  
**Status:** `not_started`  
**Reads:** section 19, 47

### Already in place

Tools that *refer* to credentials.

### This slot adds

Managed secret storage, encryption, rotation metadata, masking.

### Explicitly out of scope until later

AWS Secrets Manager production wiring (Slot 29 can swap the backend). The interface is stable now.

---

### Day 31 — Learn: secrets are not env files

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Plain env / config JSON** — will be copied into tickets and logs.
2. **Encrypt in Postgres with a key in env** — better, still weak rotation and access control.
3. **Secrets interface → local encrypted store now, AWS Secrets Manager later. Envelope encryption, IAM-like access, audit, mask on read.**

**Chosen:** 3.

Never return the raw secret to the dashboard after create except once.

#### Learning checklist

- [ ] Write `docs/adr/0016-secrets.md`
- [ ] Spike: encrypt/decrypt with a local KMS-like key
- [ ] Day 32 LLD: `secrets` service or module, grant tools a secret id, rotation field

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 32:

---

### Day 32 — Build: secrets

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Store/rotate/revoke secrets
- [ ] Tool execution resolves secret id at runtime
- [ ] Mask in API and logs
- [ ] Tests: secret body not in list endpoint; unauthorized actor cannot read; rotation invalidates cache

#### Definition of Done

Integrations can be production-safe. Widget work may begin.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 17 — Website chat widget

**Days:** 33–34  
**Wave:** D  
**Status:** `not_started`  
**Reads:** section 23, 24 (embed)

### Already in place

A complete server-side agent. No customer channel.

### This slot adds

Embeddable widget: stream, history, typing, reconnect, tool-call events, optional visitor auth.

### Explicitly out of scope until later

Inbox UI (Slot 18). Voice. Marketing site polish beyond what the widget needs.

---

### Day 33 — Learn: a widget that is not a toy

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **iframe to the dashboard chat page** — easy, ugly, auth and CSS isolation pain.
2. **Copy-paste a huge JS snippet with hardcoded keys** — keys leak.
3. **Widget package + public publishable key + origin allowlist + streaming API on the gateway.** Secret keys never in the browser.

**Chosen:** 3.

Reconnect: client holds `conversation_id` + last `seq`, replays missed messages. Do not start a new conversation on every refresh if the visitor is known.

#### Learning checklist

- [ ] Write `docs/adr/0017-website-chat.md`
- [ ] Spike: SSE/websocket choice. Prefer **SSE for assistant tokens** + REST for send if that is enough; WebSocket if you also need bidirectional typing/tool events cleanly. Pick one and stick.
- [ ] Day 34 LLD: `packages/widget-*`, embed snippet, origin allowlist, visitor session

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 34:

---

### Day 34 — Build: widget + public chat API

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Public chat routes on the gateway (publishable key, origin check)
- [ ] Streaming responses, typing, tool-call events
- [ ] Reconnect with history
- [ ] React and vanilla embed paths (vanilla can be a thin build)
- [ ] Tests: bad origin rejected; secret key rejected in browser path; tenant isolation by key

#### Definition of Done

A real site can embed the agent. This is the first customer channel.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 18 — Inbox and human handoff

**Days:** 35–36  
**Wave:** D  
**Status:** `not_started`  
**Reads:** sections 21–22

### Already in place

AI conversations. No human operator surface.

### This slot adds

Unified inbox, assignment, AI → human, human → AI, escalation reason.

### Explicitly out of scope until later

Workforce management, shift scheduling.

---

### Day 35 — Learn: humans are participants, not a fork

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Copy the transcript into a separate "ticket" product** — two sources of truth.
2. **Stop the conversation and email someone** — not an inbox.
3. **Same conversation, new participant, state `waiting_human`, runtime pauses until returned.**

**Chosen:** 3.

Assignment: claim/release with optimistic locking so two agents do not take the same thread.

#### Learning checklist

- [ ] Write `docs/adr/0018-inbox-handoff.md`
- [ ] Day 36 LLD: inbox query, assign, escalate, return-to-ai, operator message append

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 36:

---

### Day 36 — Build: inbox

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Inbox list: customer, channel, agent, status, assignee, escalation reason
- [ ] Takeover and return
- [ ] Human messages persist on the same transcript
- [ ] Runtime respects `waiting_human` (does not auto-answer)
- [ ] Tests: two claims, tenant isolation, AI cannot send while waiting_human
- [ ] Minimal operator UI or API-first UI that is actually usable

#### Definition of Done

Operations can run the chat channel. Events in the next slot will have something real to emit.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 19 — Event platform

**Days:** 37–38  
**Wave:** D  
**Status:** `not_started`  
**Reads:** sections 8, 29, 35, 37

### Already in place

Real domain actions (agent, conversation, tools, handoff) that *should* emit events.

### This slot adds

Kafka topics, schemas, producers from existing services, consumers, idempotency, DLQ, replay notes.

### Explicitly out of scope until later

Workflow graph (Slot 20). Billing consumer (Slot 26) can subscribe to a stub.

---

### Day 37 — Learn: events are not a second database

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Webhooks only** — no replay, no internal fan-out.
2. **SQS for all business events** — awkward for many independent consumers and replay.
3. **Kafka/MSK for durable business events; SQS remains for jobs.**

**Chosen:** 3.

Producer rule: the service that owns the write emits the event **after** the transaction (outbox pattern).

Outbox approaches:

1. Emit in the request after commit and hope.  
2. **Transactional outbox: write row in the same Postgres transaction, publisher ships to Kafka, consumers are idempotent.**

**Chosen:** 2. This is the difference between "demo events" and production events.

#### Learning checklist

- [ ] Write `docs/adr/0019-events.md`
- [ ] Catalog events we emit *now* (only ones we already have): `agent.created`, `agent.updated`, `conversation.started`, `message.created`, `tool.called`, `tool.failed`, `agent.escalated`
- [ ] Day 38 LLD: outbox table, publisher, consumer group example, idempotency store in Redis/Postgres

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 38:

---

### Day 38 — Build: events

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Outbox + publisher in agent, conversation, tools, runtime
- [ ] Topics partitioned by `tenant_id` (or documented key)
- [ ] Example consumer (analytics or notification stub) that is idempotent
- [ ] DLQ for poison messages
- [ ] Tests: duplicate delivery does not double-apply; replay is documented
- [ ] Event catalog in `docs/events/`

#### Definition of Done

New features from here emit events. They do not invent side-channel callbacks.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 20 — Workflow automation

**Days:** 39–40  
**Wave:** D  
**Status:** `not_started`  
**Reads:** section 30

### Already in place

Events. No automatic "if lead then call" yet — leads do not exist. Build the **engine** on events we do have (`conversation.completed`, `agent.escalated`).

### This slot adds

Trigger → condition → action, with retries, state, idempotency, timeouts.

### Explicitly out of scope until later

Campaign/lead actions get registered in Slots 23–24. Do not fake those domains today.

---

### Day 39 — Learn: a workflow engine we can explain

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Temporal/Cadence immediately** — excellent for long-running work; extra platform to run in 6 hours. Revisit if the custom engine is clearly insufficient.
2. **n8n/Zapier embed** — not our reliability story.
3. **Our Workflow Service: event trigger, JSON condition, action invokers, state machine, SQS for step retries, Kafka for triggers.**

**Chosen:** 3 for 60 days. Document Temporal as the promotion path if we need years-long durable timers.

Idempotency: `workflow_run_id` + step key. Replay must not call the customer twice.

#### Learning checklist

- [ ] Write `docs/adr/0020-workflows.md`
- [ ] Design one real workflow: `agent.escalated` → notify (log/email stub)
- [ ] Day 40 LLD: definitions, runs, steps, timeout, DLQ

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 40:

---

### Day 40 — Build: Workflow Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/workflow`
- [ ] CRUD definitions (permissioned)
- [ ] Runner consumes Kafka, enqueues steps
- [ ] Retry, timeout, failed terminal state
- [ ] Tests: duplicate event one run; step retry; condition false skips action
- [ ] Register action ports for later campaign/lead/voice

#### Definition of Done

Wave D complete. Automation exists. Voice can be added as a channel without redesigning chat.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

# WAVE E — Voice and growth (Days 41–50)

Goal of this wave: the same agent works on the phone, can be campaigned, can qualify leads, and can be measured.

---

## Slot 21 — Voice path

**Days:** 41–42  
**Wave:** E  
**Status:** `not_started`  
**Reads:** sections 7, 25

### Already in place

Runtime, conversations, tools. No audio.

### This slot adds

Telephony → voice gateway → realtime session → STT → runtime → TTS → audio. Inbound and outbound call lifecycle.

### Explicitly out of scope until later

Barging, voicemail policy, campaign dialer (Slots 22–23). Get a **working call** first.

---

### Day 41 — Learn: realtime is a different subsystem

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Batch record the whole call, transcribe, then answer** — not a voice agent.
2. **Vendor black-box "AI phone" with no runtime** — cannot reuse tools/knowledge/versions.
3. **Our Voice Service + provider telephony (SIP/PSTN via a vendor), our session, STT/TTS streaming, same Agent Runtime for turns.**

**Chosen:** 3.

Provider choice is an ADR. Use one telephony/STT/TTS stack you can actually run (for example Twilio or a SIP+Deepgram+Cartesia style split). The **session state machine** is ours.

Calls create conversations with `channel=voice`. Do not create a parallel history table.

#### Learning checklist

- [ ] Write `docs/adr/0021-voice-path.md`
- [ ] Latency budget: audio → STT → runtime/LLM → TTS
- [ ] Spike: one inbound test call or a local audio loop if PSTN is unavailable
- [ ] Day 42 LLD: call states, media fork, conversation linkage

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 42:

---

### Day 42 — Build: Voice Service (happy path)

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/voice`
- [ ] Inbound webhook/SIP entry
- [ ] Outbound originate API
- [ ] Stream STT → runtime turn → TTS
- [ ] Call record: ids, tenant, agent version, conversation id, state
- [ ] Events: `call.started` (complete `call.completed` tomorrow if needed — prefer both today if time)
- [ ] Tests: tenant on every call; runtime failures end the call in a known state

#### Definition of Done

A call can be placed or received and the *same* agent version talks. Reliability work is tomorrow, not a rebuild.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 22 — Voice reliability

**Days:** 43–44  
**Wave:** E  
**Status:** `not_started`  
**Reads:** section 26

### Already in place

Happy-path voice.

### This slot adds

VAD, barge-in, recording, transcripts, provider failure, silence, reconnect, transfer, concurrency limits.

### Explicitly out of scope until later

Campaign pacing (Slot 23).

---

### Day 43 — Learn: the voice failure matrix

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

For each dependency write the section 40 block: what fails, detect, immediate behavior, retry, fallback, recover, consistency.

Cover: STT timeout, TTS failure, LLM latency, caller disconnect, barge-in, silence, transfer failure.

#### Approaches to learn

1. **Ignore barge-in** — users talk over a long TTS and the agent sounds broken.
2. **Interrupt TTS on VAD speech, cancel in-flight LLM if needed, start a new turn.**

**Chosen:** 2.

Recording: audio in S3, transcript on the conversation, not a mystery blob in Redis.

#### Learning checklist

- [ ] Write `docs/adr/0022-voice-reliability.md`
- [ ] Latency metrics list
- [ ] Day 44 LLD: VAD, interrupt, record, transfer, concurrency semaphore in Redis

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 44:

---

### Day 44 — Build: reliable voice

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] VAD + barge-in
- [ ] Recording + transcript persistence
- [ ] Transfer attempt with failure state
- [ ] Concurrency limits
- [ ] Metrics hooks for STT/LLM/TTS latency
- [ ] Tests or fixtures for disconnect mid-TTS and STT timeout fallback line
- [ ] `call.completed` with outcome

#### Definition of Done

Voice is a production subsystem, not a demo ringtone.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 23 — Outbound campaigns

**Days:** 45–46  
**Wave:** E  
**Status:** `not_started`  
**Reads:** section 27

### Already in place

Outbound call API + events.

### This slot adds

Campaign, audience, schedule, timezone, pacing, retries, pause/resume, outcomes, opt-out.

### Explicitly out of scope until later

Lead scoring (Slot 24). The campaign can take a static audience CSV/API.

---

### Day 45 — Learn: a dialer is a queue with laws

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **for-loop outbound calls in a web request** — will die and double-dial.
2. **Cron that dumps all calls at 9:00** — no pacing, no timezone, no opt-out.
3. **Campaign Service: audience rows, scheduler, SQS work items, Redis concurrency, idempotent dial keys, voicemail/no-answer outcomes.**

**Chosen:** 3.

Compliance: opt-out must be checked **at dial time**, not only at import.

#### Learning checklist

- [ ] Write `docs/adr/0023-campaigns.md`
- [ ] Day 46 LLD: states, schedule, retry, stats counters (eventual consistency OK)

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 46:

---

### Day 46 — Build: Campaign Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/campaign`
- [ ] Audience import, timezone, start/pause/resume
- [ ] Worker dials via Voice Service
- [ ] Outcomes: answered, no-answer, voicemail, failed, opted_out
- [ ] Events: `campaign.started`, `campaign.completed`
- [ ] Tests: pause stops further dials; opt-out never dials; duplicate work item does not double-dial

#### Definition of Done

Outbound voice is operable as a campaign, not a single API click.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 24 — Lead generation

**Days:** 47–48  
**Wave:** E  
**Status:** `not_started`  
**Reads:** section 28

### Already in place

Campaigns and qualification-capable agents.

### This slot adds

Lead object, source, score hook, campaign enrollment, CRM update as a tool/event.

### Explicitly out of scope until later

A full CRM product.

---

### Day 47 — Learn: leads are a domain, not a spreadsheet

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Store leads as conversation metadata** — cannot campaign or score cleanly.
2. **Lead Service** with status, score, owner, source, links to conversation/campaign.

**Chosen:** 2.

Flow to implement: source → lead.created event → workflow can run qualification agent → score → optional campaign enroll → CRM tool.

#### Learning checklist

- [ ] Write `docs/adr/0024-leads.md`
- [ ] Day 48 LLD: lead APIs, score field, workflow action `enroll_campaign`

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 48:

---

### Day 48 — Build: leads

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Lead CRUD + status transitions
- [ ] `lead.created` / `lead.updated`
- [ ] Workflow: created → qualify (runtime) → if score > threshold enroll campaign
- [ ] CRM update through tools
- [ ] Tests: tenant isolation; workflow idempotent on duplicate `lead.created`

#### Definition of Done

Growth loop exists on top of agents, events, workflows, campaigns.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 25 — Evaluation

**Days:** 49–50  
**Wave:** E  
**Status:** `not_started`  
**Reads:** section 31, 55

### Already in place

A real agent with versions. We have been changing it without measuring.

### This slot adds

Datasets, runners, scores, compare versions, gate-friendly reports.

---

### Day 49 — Learn: measure instead of guessing

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Vibe-check in the dashboard** — not regression.
2. **LLM-as-judge only** — useful for open answers, noisy and gameable.
3. **Golden datasets (input, expected behavior, expected tool, expected answer) + deterministic checks + optional LLM judge + latency/failure metrics.**

**Chosen:** 3.

Eval runs are jobs (SQS), not a 10-minute HTTP request.

#### Learning checklist

- [ ] Write `docs/adr/0025-evaluation.md`
- [ ] Day 50 LLD: dataset, case, run, scores, compare vN vs vN+1

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 50:

---

### Day 50 — Build: Evaluation Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/evaluation`
- [ ] Import dataset, run against an agent version offline (no production traffic)
- [ ] Metrics: correctness, tool selection, retrieval hit if applicable, latency, failure rate
- [ ] Report: v10 87% vs v11 92% style output
- [ ] Tests: same dataset + same version is stable enough; tenant datasets isolated

#### Definition of Done

Wave E complete. Quality is a number. Shipping can be compared.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

# WAVE F — Harden and ship (Days 51–60)

Goal of this wave: money, audit, ops, cloud, proof. No new product domain unless a hole is found in the coverage map.

---

## Slot 26 — Usage, cost, and billing

**Days:** 51–52  
**Wave:** F  
**Status:** `not_started`  
**Reads:** sections 32–33

### Already in place

Token usage hooks, voice minutes (call duration), tool executions, conversations.

### This slot adds

Meters by org/agent/campaign/conversation/model/provider, then plans, quotas, credits, subscription status, invoices, overage concepts.

---

### Day 51 — Learn: ledger first, Stripe second

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Stripe as the source of truth for usage** — we will fight the provider on AI/voice meters.
2. **Our usage ledger + billing projection; Stripe (or stub) for collection later.**

**Chosen:** 2.

Consistency: **ledger writes are strongly consistent**; dashboard rollups may be eventual (Kafka consumer).

Quotas: check at gateway/runtime with Redis counters fed from the ledger, not a guess.

#### Learning checklist

- [ ] Write `docs/adr/0026-usage-billing.md`
- [ ] Map every meter to an existing emitter
- [ ] Day 52 LLD: `services/usage`, invoice model, quota middleware

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 52:

---

### Day 52 — Build: Usage / Billing Service

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Ingest usage from model gateway, voice, tools, knowledge embeds
- [ ] Query by org/agent/campaign/conversation/model/provider
- [ ] Plans, quotas, credits, subscription status, invoice records, overage flag
- [ ] Enforce a quota on runtime/gateway
- [ ] Tests: usage from tenant A never appears in B; quota trip is deterministic

#### Definition of Done

Cost is visible and limitable. Fancy tax/dunning is not required.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 27 — Audit and security

**Days:** 53–54  
**Wave:** F  
**Status:** `not_started`  
**Reads:** sections 34, 47

### Already in place

Many mutating APIs with almost no immutable audit trail.

### This slot adds

Audit Service + security hardening: prompt injection, tool allow-lists review, PII, WAF notes, s2s auth.

---

### Day 53 — Learn: audit vs logs vs traces

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Grep logs for "user updated agent"** — not an audit system.
2. **Audit rows in each service only** — cannot query tenant-wide activity.
3. **Audit Service consumes outbox/audit events; records actor, tenant, action, resource, timestamp, request_id, metadata. Immutable.**

**Chosen:** 3.

Security work today is a **checklist against section 47**, not a new product.

Also learn:

- Prompt injection vs retrieval poisoning
- Why tools must stay allow-listed (already built — verify)
- Service-to-service auth: **mTLS or signed internal JWT**, not open cluster DNS

**Chosen for s2s:** signed internal JWT or HMAC now; mTLS when on EKS if time.

#### Learning checklist

- [ ] Write `docs/adr/0027-audit-and-security.md`
- [ ] Threat pass: IDOR, prompt leak, secret leak, cross-tenant search
- [ ] Day 54 LLD: audit API, required audited actions list from section 34

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 54:

---

### Day 54 — Build: Audit Service + hardening

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] `services/audit`
- [ ] Record listed actions (login, agent change/publish, tool create, permission, secret, workflow, campaign start/stop, assignment)
- [ ] Query API for operators
- [ ] Internal service auth on all service-to-service calls
- [ ] Prompt-injection tests on runtime (tool not in allow-list cannot run from hostile user text)
- [ ] PII redaction pass on logs
- [ ] Rate limit / WAF notes for cloud

#### Definition of Done

Security is enforced and evidenced, not assumed.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 28 — Observability, alerts, notifications

**Days:** 55–56  
**Wave:** F  
**Status:** `not_started`  
**Reads:** sections 44–46, 36 (notification)

### Already in place

OTel hooks from Slot 03, some metrics from voice/runtime. Incomplete dashboards and no alert policy.

### This slot adds

Full metric set, alert rules, notification service for user-facing and ops events.

---

### Day 55 — Learn: signals that change what you do

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **Log everything, alert on everything** — pages become noise.
2. **Golden signals + AI/voice/business metrics from section 45, alerts only for section 46 conditions with thresholds.**

**Chosen:** 2.

Notifications:

1. Put SMTP inside every service.
2. **Notification Service consumes events/alert hooks; email/slack/webhook.**

**Chosen:** 2.

#### Learning checklist

- [ ] Write `docs/adr/0028-observability-alerts.md`
- [ ] Threshold draft: error rate, P99, DB connections, queue depth, Kafka lag, Redis memory, pod restarts, LLM failure, voice latency
- [ ] Day 56 LLD: dashboards-as-code if possible, alert rules, `services/notification`

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 56:

---

### Day 56 — Build: complete telemetry + notifications

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Confirm every request can show gateway → agent → runtime → knowledge → LLM → tool
- [ ] Export system, AI, voice, and business metrics
- [ ] Alert rules (local Prometheus/Alertmanager or equivalent)
- [ ] `services/notification` for workflow/ops messages
- [ ] Tests: a failed LLM increments the right metric; a notification consumer is idempotent

#### Definition of Done

We can operate the system we already built.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 29 — AWS, Kubernetes, Terraform, CI/CD

**Days:** 57–58  
**Wave:** F  
**Status:** `not_started`  
**Reads:** sections 48–54

### Already in place

A platform that runs locally. Cloud must **deploy this**, not invent a new app.

### This slot adds

Terraform modules, EKS deploy, environments, pipeline, rolling + blue/green notes, rollback.

---

### Day 57 — Learn: cloud is a destination, not a rewrite

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

1. **ClickOps in the AWS console** — unreproducible, violates section 50.
2. **ECS/Fargate only** — valid AWS, weaker Kubernetes learning vs the project goal.
3. **Terraform + EKS + ECR + managed data services, mapped 1:1 from Compose.**

**Chosen:** 3.

Environments: `local` (exists), `dev`, `staging`, `production` modules with smaller capacity for non-prod.

CI:

```text
push → lint → unit → integration → security scan → image → ECR → deploy dev → smoke → staging → smoke
```

Production deploy can be gated. Implement the pipeline through staging.

Blue/green vs rolling:

- Default k8s rolling with probes.
- Blue/green (or two target groups) for the gateway/runtime if ALB allows. Document rollback.

#### Learning checklist

- [ ] Write `docs/adr/0029-aws-eks-cicd.md`
- [ ] Map each Compose service to AWS: RDS/Aurora, ElastiCache, MSK, SQS, S3, OpenSearch, Secrets Manager
- [ ] Day 58 LLD: `infra/modules`, `infra/environments/dev`, GitHub Actions, Helm/manifests

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 58:

---

### Day 58 — Build: infra as code and pipeline

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

#### Build checklist

- [ ] Terraform: VPC-ish networking, IAM, EKS, data stores (dev sized)
- [ ] Docker images + ECR push
- [ ] K8s: deployments, services, probes, resources, HPA on gateway/runtime
- [ ] CI workflow through staging smoke
- [ ] Rollback instructions
- [ ] If real AWS is unavailable in the environment, Terraform must still `validate`/`plan` and the pipeline must run against local/kind — do not fake green deploys

#### Definition of Done

Infrastructure is code. A bad deploy has a written reverse path.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:

---

## Slot 30 — Load, failure, DR, SDKs, closeout

**Days:** 59–60  
**Wave:** F  
**Status:** `not_started`  
**Reads:** sections 24, 55–63

### Already in place

The system and a way to deploy it.

### This slot adds

Proof, developer platform polish, runbooks, and a final pass against section 63. This is not a new product wave.

### Explicitly out of scope

New domains. If something from the coverage map is missing, finish that earlier slot's leftover work — do not invent Slot 31.

---

### Day 59 — Learn: how we prove the system and how developers use it

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Learning

#### Approaches to learn

**Load testing**

1. Click the widget ten times and call it scale.  
2. **Scripted load against gateway + runtime + conversations: ramp traffic, record throughput, P50/P95/P99, errors, DB connections, Redis, queue depth, Kafka lag.**  
   We will not hit 1,000 RPS in one evening on a laptop. We *will* find the first saturation point and write what would scale next (HPA, pool size, partition count).

**Chosen:** 2.

**Failure testing**

1. Only unit-test mocks.  
2. **Kill or timeout one dependency at a time: Postgres, Redis, Kafka consumer, SQS worker, model provider, STT/TTS, a pod.** Verify detect → alert or log → fallback/retry → recovery → no cross-tenant corruption.

**Chosen:** 2. This is chaos on a schedule, not Netflix-scale chaos automation.

**Disaster recovery**

1. "We have Terraform so we are fine."  
2. **Written RTO/RPO, backup/restore of Postgres and S3, how to replay Kafka, how to recreate the stack from Terraform, one restore rehearsal.**

**Chosen:** 2.

**Developer platform**

1. "The OpenAPI file is the SDK."  
2. **TypeScript SDK generated or hand-written against the public API (`agent.run/stream`, `conversation.create/send`, `knowledge.search`), plus a thin Python SDK if time remains after TypeScript is real.**

**Chosen:** 2. TypeScript is required. Python is required-if-time, not a reason to slip runbooks.

#### Learning checklist

- [ ] Write `docs/adr/0030-proof-and-developer-platform.md`
- [ ] Pick load tool (k6 or vegeta or autocannon) and the exact scenario: authenticated chat stream, not a health check flood
- [ ] Write the failure matrix for tomorrow: one row per dependency from section 40 that we actually have
- [ ] List runbooks we will write on Day 60 (section 62)
- [ ] Day 60 LLD: test scripts location, SDK package layout, closeout checklist

#### End-of-day notes

- Date:
- Outcome:
- Carry into Day 60:

---

### Day 60 — Build: prove it, ship SDKs, close the board

**Status:** `not_started`  
**Hours:** 6  
**Mode:** Building

Spend the day in this order. Do not start SDK polish if proof work is unfinished.

#### Hour-by-hour

| Hours | Work |
| --- | --- |
| 0:00–2:00 | Load test the chat/runtime path. Save a results file under `tests/load/`. Write bottlenecks, not vibes. |
| 2:00–3:30 | Failure tests: at least Redis down, model gateway timeout, SQS worker crash, duplicate Kafka message. Record pass/fail in `tests/failure/`. |
| 3:30–4:15 | DR notes + one backup/restore or Terraform recreate dry-run. Fill RTO/RPO. |
| 4:15–5:15 | TypeScript SDK: `agent.run`, `agent.stream`, `conversation.create`, `conversation.send`, `knowledge.search`. Example README. |
| 5:15–6:00 | Runbooks, section 63 coverage check, progress board to 60/60, final commit. |

#### Build checklist

- [ ] Load test results with P50/P95/P99, error rate, and one named bottleneck
- [ ] Failure tests for cache, LLM, queue worker, duplicate event
- [ ] `docs/runbooks/` for: database failure, Redis outage, Kafka lag, SQS backlog, LLM outage, voice provider outage, deployment rollback, high CPU, high P99
- [ ] RTO/RPO written in `docs/architecture/disaster-recovery.md`
- [ ] TypeScript SDK in `sdk/typescript` with a working example against local gateway
- [ ] Python SDK stub or full client if TypeScript and runbooks are done
- [ ] Walk the coverage map below and mark each item `done` or `gap` with a pointer to the slot that owns the gap
- [ ] Update Progress Board: Current day Day 60, 60/60 (100%) only if Definitions of Done across slots are honest

#### Definition of Done

The 60-day project can be demonstrated as a platform: multi-tenant agents on chat and voice, knowledge, tools, inbox, events, workflows, campaigns, leads, eval, usage, audit, observability, infra-as-code, and proof of failure behavior. Gaps are written, not hidden.

#### End-of-day notes

- Date:
- Shipped:
- Slipped:
- Blockers:
- Gaps to carry after day 60 (if any):

---

# Coverage map — project_details.md → slots

Use this so a later section in `project_details.md` does not feel like a surprise new project. When you finish a slot, mark the rows it owns.

| Details section | Topic | Slot | Status |
| --- | --- | --- | --- |
| 1–3, 64–66 | Purpose, philosophy, anti-goals | 01 | `not_started` |
| 4–5 | Tenancy and API scale targets (design, not a 1k RPS day-1 cluster) | 01, 06, 30 | `not_started` |
| 6 | Conversation volume and features | 09, 17, 18 | `not_started` |
| 7, 25–26 | Voice scale, path, reliability | 21, 22 | `not_started` |
| 8, 29 | Event scale and custom events | 19 | `not_started` |
| 9, 35 | Data architecture | 02 | `not_started` |
| 10, 14 | Agent concept and builder | 07 | `not_started` |
| 11 | Agent lifecycle and versions | 08 | `not_started` |
| 12 | Multi-tenant hierarchy | 04, 05 | `not_started` |
| 13 | IAM, RBAC, API keys | 04, 05, 15 | `not_started` |
| 15 | Knowledge / RAG | 12, 13 | `not_started` |
| 16 | Agent runtime | 11 | `not_started` |
| 17 | Model gateway | 10 | `not_started` |
| 18 | Tools, integrations, MCP | 15 | `not_started` |
| 19 | Secrets | 16 | `not_started` |
| 20 | Knowledge vs short-term vs long-term memory | 09, 14 | `not_started` |
| 21–22 | Conversations, inbox, handoff | 09, 18 | `not_started` |
| 23 | Website chat | 17 | `not_started` |
| 24 | Developer platform / SDKs | 06, 30 | `not_started` |
| 27 | Campaigns | 23 | `not_started` |
| 28 | Leads | 24 | `not_started` |
| 30 | Workflows | 20 | `not_started` |
| 31 | Evaluation | 25 | `not_started` |
| 32–33 | Usage, cost, billing | 26 | `not_started` |
| 34 | Audit | 27 | `not_started` |
| 36–37 | Services and communication | 01, 06, 19 | `not_started` |
| 38–40 | Reliability, HA, failure | 03, 22, 29, 30 | `not_started` |
| 41 | Consistency | 08, 19, 26 | `not_started` |
| 42 | Caching | 03, 07, 16 | `not_started` |
| 43 | Read replicas | 08 (read-after-write rule), 29 | `not_started` |
| 44–46 | Observability, metrics, alerts | 03, 28 | `not_started` |
| 47 | Security | 04, 05, 16, 27 | `not_started` |
| 48–52 | AWS, K8s, Terraform, environments | 02, 29 | `not_started` |
| 53–54 | CI/CD and deploy strategy | 29 | `not_started` |
| 55–56 | Testing and load | every build day, 30 | `not_started` |
| 57–58 | DR and chaos | 30 | `not_started` |
| 59 | Developer experience | 01, 30 | `not_started` |
| 60–62 | Repo, ADRs, runbooks | 01, 30 | `not_started` |
| 63 | Final demonstration list | 30 closeout | `not_started` |

---

# Section 63 closeout checklist

Mark these on Day 60. If one is not true, write the gap and the slot that must be repaired. Do not invent a new architecture to tick a box.

- [ ] Multi-tenancy
- [ ] Microservices with real domain boundaries
- [ ] API gateway
- [ ] Authentication
- [ ] Authorization / RBAC
- [ ] Aurora/Postgres + read-after-write rule (replicas in Terraform if present)
- [ ] Redis: cache, invalidation, limits, locks
- [ ] Kafka + SQS + DLQ
- [ ] S3-compatible object storage
- [ ] OpenSearch retrieval
- [ ] Agent runtime
- [ ] LLM gateway
- [ ] RAG
- [ ] Tools + MCP
- [ ] Memory
- [ ] Chat widget
- [ ] Voice
- [ ] Campaigns
- [ ] Workflows
- [ ] Human handoff
- [ ] Evaluation
- [ ] Usage + billing concepts
- [ ] Audit
- [ ] Security checks
- [ ] Observability, tracing, metrics, logs, alerts
- [ ] Autoscaling config on EKS
- [ ] Terraform
- [ ] CI/CD
- [ ] Blue/green or documented rolling + rollback
- [ ] Load testing evidence
- [ ] Failure testing evidence
- [ ] Disaster recovery write-up

---

# Daily log (append only)

Copy one block per calendar day. Newest at the bottom.

```text
## YYYY-MM-DD — Day N (learn|build) — Slot NN
Hours worked:
Status: done | slipped | blocked
Shipped:
Did not ship:
Blocker:
ADR/LLD path:
Notes for tomorrow:
```

---

# If you fall behind

Do not skip a wave to "catch up" on voice or AWS. That produces the rewrite this plan exists to avoid.

1. Finish the current slot's Definition of Done, even if it burns the next calendar day.
2. Mark the extra day in the daily log as `slipped recovery`, not as the next slot.
3. Compress only **inside** a later slot's nice-to-haves (Python SDK, extra providers, extra dashboards).
4. Never compress: tenancy tests, timeouts, outbox/idempotency, secret masking, or the failure matrix.

If more than two slots are `slipped` at once, stop building features and spend the next learning day only on closing gaps. The 60-day finish is a complete platform, not a half-working voice demo on a broken tenant model.
