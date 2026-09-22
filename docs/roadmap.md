# QuickStart AI — 60-Day Roadmap

This file is the **plan** and the **progress tracker**.

- What we build: [`docs/project_details.md`](./project_details.md)
- When we build it: this file
- How we track it: checkboxes and status in this file

Please update this file every work day.

---

## Contents

1. [How to use this file](#1-how-to-use-this-file)
2. [Daily work rules](#2-daily-work-rules)
3. [How the 60 days connect](#3-how-the-60-days-connect)
4. [Progress board](#4-progress-board)
5. [Six waves](#5-six-waves)
6. [Day-by-day plan](#6-day-by-day-plan)
7. [Coverage map](#7-coverage-map)
8. [Final checklist](#8-final-checklist)
9. [Daily log](#9-daily-log)
10. [If we fall behind](#10-if-we-fall-behind)

---

## 1. How to use this file

A **slot** = 2 days.

- Day 1 of the slot = **learn**
- Day 2 of the slot = **build**

Do not start the next slot if this slot is not done.

### Every day, do this

1. Set **Current day** and **Current slot** in the [Progress board](#4-progress-board).
2. Set that day status to `in_progress`.
3. Tick the task boxes while you work.
4. At the end, fill **Day notes**.
5. Set status to `done`, `blocked`, or `slipped`.

### Status meaning

| Status        | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `not_started` | We did not start this day                                        |
| `in_progress` | This is today                                                    |
| `done`        | The "Done when" list is true. Not only "some code exists"        |
| `blocked`     | We cannot finish. Write the reason in Day notes                  |
| `slipped`     | We started, but it is not done. Finish this before the next slot |

---

## 2. Daily work rules

### Time

| Item                   | Rule               |
| ---------------------- | ------------------ |
| Calendar               | 60 days, every day |
| Hours each day         | 6 hours            |
| Total                  | 360 hours          |
| Odd days (1, 3, 5...)  | Learn              |
| Even days (2, 4, 6...) | Build              |

### Learn day (6 hours)

| Time      | What to do                                                                         |
| --------- | ---------------------------------------------------------------------------------- |
| 0:00–0:45 | Read the listed `project_details.md` parts. Write "What we already have"           |
| 0:45–2:30 | Study the options. For each option, write: what it is, what can fail, cost to run  |
| 2:30–3:30 | Write the ADR. Say which option we choose, and why                                 |
| 3:30–5:00 | Do a small spike. One working proof. Do not build the product feature yet          |
| 5:00–6:00 | Write tomorrow LLD: files, APIs, tables, tests, "Done when". Mark learn day `done` |

Learn day is done only when we have:

- one ADR
- one LLD for the build day
- one small spike if the idea is new

### Build day (6 hours)

| Time      | What to do                                                                              |
| --------- | --------------------------------------------------------------------------------------- |
| 0:00–0:30 | Read yesterday ADR + LLD. Do not redesign unless the LLD is wrong                       |
| 0:30–4:00 | Build with AI. You still decide: service boundary, tenant isolation, failure, API shape |
| 4:00–5:15 | Tests: happy path, tenant isolation, one timeout/retry/failure case                     |
| 5:15–6:00 | Logs/traces, tick boxes, commit. Mark `done` only if "Done when" is true                |

### How we use AI

Please use AI a lot for: boilerplate, tests, clients, Terraform, docs, first code.

Do **not** let AI decide these:

- service boundary
- consistency model
- tenant isolation
- what happens when a dependency fails
- sync vs async
- Postgres vs Redis vs S3 vs OpenSearch vs Kafka vs SQS

If we cannot explain those in simple words, we are still on the learn day.

### Production bar for every build day

Every feature must have:

- `tenant_id` on tenant data
- `request_id` and `trace_id`
- timeout on every network call
- structured errors (not raw vendor errors)
- one test that fails if Tenant A can read Tenant B
- no secrets and no raw PII in logs
- a short note in the ADR: "If X fails, we do Y"

### What "finish the whole project in 60 days" means

We will build the full platform in `project_details.md`, step by step, at production quality.

It means:

- each domain is a real service
- chat, knowledge, tools, inbox, events, workflows, voice, campaigns, leads, eval, usage/billing, and audit work together
- local Docker is the daily environment
- Terraform / EKS / CI can deploy a staging-like environment
- important failures are coded and tested
- ADRs, runbooks, SDKs, and this board stay up to date

It does **not** mean:

- 1,000 RPS on a laptop on day 60
- one year of ops work hidden in 6 hours
- a big rewrite in week 8

If a slot wants to rebuild old work, stop. The old slot is not done. Fix that first.

---

## 3. How the 60 days connect

Read this once. Later slots will not repeat the full story.

```text
1. Foundation     repo + Docker data stores + shared libraries
2. Access         identity → workspace / tenancy → API gateway
3. Core objects   agent → versions → conversation
4. Working agent  model gateway → runtime (LLM can reply)
5. Smarter agent  knowledge ingest → retrieval → memory
6. Agent can act  tools / MCP → secrets
7. First channel  website widget
8. Operations     inbox + human handoff
9. Nervous system events → workflows
10. Second channel voice path → voice reliability
11. Growth        campaigns → leads
12. Quality/money evaluation → usage → billing
13. Ship          audit / security → observability → AWS / EKS / CI → load / failure / DR / SDKs
```

Simple rules:

1. Runtime starts with LLM only. Later we **add stages**. We do not replace the runtime.
2. Voice is a new **channel**. Same runtime. Not a second agent engine.
3. Campaigns use Voice + Conversation. Not a new caller system.
4. We emit Kafka events only after the object exists.
5. AWS / EKS come last. Local Docker is for daily work. Cloud deploys what already exists.

---

## 4. Progress board

Update these three lines every day.

- **Current day:** Day 5
- **Current slot:** Slot 03 — Shared platform libraries
- **Overall progress:** 4 / 60 days (~7%)

| Slot | Days  | Theme                                | Learn | Build | Status        |
| ---- | ----- | ------------------------------------ | ----- | ----- | ------------- |
| 01   | 1–2   | Engineering foundation               | [ ]   | [x]   | `done`        |
| 02   | 3–4   | Local data plane                     | [x]   | [x]   | `done`        |
| 03   | 5–6   | Shared platform libraries            | [ ]   | [ ]   | `not_started` |
| 04   | 7–8   | Identity                             | [ ]   | [ ]   | `not_started` |
| 05   | 9–10  | Workspace and tenancy                | [ ]   | [ ]   | `not_started` |
| 06   | 11–12 | API gateway                          | [ ]   | [ ]   | `not_started` |
| 07   | 13–14 | Agent service                        | [ ]   | [ ]   | `not_started` |
| 08   | 15–16 | Agent lifecycle and versions         | [ ]   | [ ]   | `not_started` |
| 09   | 17–18 | Conversation service                 | [ ]   | [ ]   | `not_started` |
| 10   | 19–20 | Model gateway                        | [ ]   | [ ]   | `not_started` |
| 11   | 21–22 | Agent runtime                        | [ ]   | [ ]   | `not_started` |
| 12   | 23–24 | Knowledge ingestion                  | [ ]   | [ ]   | `not_started` |
| 13   | 25–26 | Retrieval in the runtime             | [ ]   | [ ]   | `not_started` |
| 14   | 27–28 | Memory                               | [ ]   | [ ]   | `not_started` |
| 15   | 29–30 | Tools and MCP                        | [ ]   | [ ]   | `not_started` |
| 16   | 31–32 | Secrets                              | [ ]   | [ ]   | `not_started` |
| 17   | 33–34 | Website chat widget                  | [ ]   | [ ]   | `not_started` |
| 18   | 35–36 | Inbox and human handoff              | [ ]   | [ ]   | `not_started` |
| 19   | 37–38 | Event platform                       | [ ]   | [ ]   | `not_started` |
| 20   | 39–40 | Workflow automation                  | [ ]   | [ ]   | `not_started` |
| 21   | 41–42 | Voice path                           | [ ]   | [ ]   | `not_started` |
| 22   | 43–44 | Voice reliability                    | [ ]   | [ ]   | `not_started` |
| 23   | 45–46 | Campaigns                            | [ ]   | [ ]   | `not_started` |
| 24   | 47–48 | Leads                                | [ ]   | [ ]   | `not_started` |
| 25   | 49–50 | Evaluation                           | [ ]   | [ ]   | `not_started` |
| 26   | 51–52 | Usage, cost, billing                 | [ ]   | [ ]   | `not_started` |
| 27   | 53–54 | Audit and security                   | [ ]   | [ ]   | `not_started` |
| 28   | 55–56 | Observability, alerts, notifications | [ ]   | [ ]   | `not_started` |
| 29   | 57–58 | AWS, EKS, Terraform, CI/CD           | [ ]   | [ ]   | `not_started` |
| 30   | 59–60 | Load, failure, DR, SDKs, closeout    | [ ]   | [ ]   | `not_started` |

---

## 5. Six waves

| Wave             | Days  | When this wave ends, we have                                                                | Do not start yet                    |
| ---------------- | ----- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| A Foundation     | 1–10  | Repo, local Postgres / Redis / Kafka / OpenSearch / OTel, shared libs, identity, workspaces | Agents, chat, AWS                   |
| B Core objects   | 11–20 | API gateway, agents, versions, conversations, model gateway                                 | Runtime replies, RAG, voice         |
| C Working agent  | 21–30 | Streaming runtime, knowledge pipeline, retrieval, memory, tools / MCP                       | Widget, inbox, product Kafka events |
| D Channel + ops  | 31–40 | Secrets, website chat, inbox / handoff, events, workflows                                   | Voice, campaigns, billing           |
| E Voice + growth | 41–50 | Voice calls, reliable realtime path, campaigns, leads, eval                                 | Cloud deploy, DR                    |
| F Harden + ship  | 51–60 | Usage / billing, audit / security, alerts, AWS / EKS / CI, load / failure / DR, SDKs        | New product domains                 |

Jump to a wave:

- [Wave A — Foundation](#wave-a--foundation-days-110)
- [Wave B — Core objects](#wave-b--core-objects-days-1120)
- [Wave C — Working agent](#wave-c--working-agent-days-2130)
- [Wave D — Channel and operations](#wave-d--channel-and-operations-days-3140)
- [Wave E — Voice and growth](#wave-e--voice-and-growth-days-4150)
- [Wave F — Harden and ship](#wave-f--harden-and-ship-days-5160)

---

## 6. Day-by-day plan

Each slot has the same shape:

1. **What we already have**
2. **What we add now**
3. **Not now**
4. **Why this slot is now**
5. Learn day: options → we choose → why → tasks
6. Build day: tasks → done when

---

# WAVE A — Foundation (Days 1–10)

**Wave goal:** a repo and a local platform. Later services can join with the same rules.

---

## Slot 01 — Engineering foundation

|        |                                                     |
| ------ | --------------------------------------------------- |
| Days   | 1–2                                                 |
| Wave   | A                                                   |
| Status | `done`                                              |
| Read   | `project_details.md` sections 1–3, 36, 59–61, 64–66 |

**What we already have:** monorepo scaffold, ADR 0001, `packages/contracts`, `services/_template`, root `pnpm check`.

**What we add now:** repo shape, engineering rules, ADR habit (write the decision before code).

**Not now:** Docker data stores (Slot 02). Auth (Slot 04). Product APIs.

**Why this slot is now:** if we start with chat API first, every service will use a different layout and error format. Then we must rewrite.

---

### Day 1 — LEARN: how we will build

**Status:** `not_started` · **Hours:** 6

**Goal:** choose repo style and write the first ADR.

#### Options

| Option                            | Idea                                                 | Problem                                             |
| --------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| A. Polyrepo                       | One git repo per service                             | Small team. Many PRs. Contracts drift               |
| B. Monolith first                 | One app now, split later                             | Fast week 1. Big rewrite when events and voice come |
| C. Monorepo + services + packages | One repo. Many deployable services. Shared libraries | Matches section 60. This is what we want            |

**We choose: C.**

**Why this is better:** we get real service boundaries. We can change a contract in one PR. We do not need 16 GitHub repos.

#### Also decide today

- Language: **TypeScript on Node** for most services. Later voice may add a small sidecar if needed. One language keeps the 60 days honest.
- Public API: **HTTP/JSON**. gRPC only later for a hot internal path.
- Tests: unit tests next to code. Integration tests talk to Docker.
- Git: trunk + short slot branches.
- ADR: one ADR per slot in `docs/adr/`.

#### Learn tasks

- [ ] Read sections 1–3, 36, 59–61, 64–66
- [ ] Compare polyrepo / monolith / monorepo. Write why monorepo wins for this team and this calendar
- [ ] Write `docs/adr/0001-monorepo-and-service-boundaries.md`
- [ ] Sketch the empty tree from section 60. Do not create fake product services
- [ ] Write Day 2 LLD: folders, lint / test / build commands, README, `.gitignore`
- [ ] Define service template: `src/`, health endpoint, Dockerfile, README, OpenAPI stub

#### Day notes

- Date:
- Result:
- Need for Day 2:

---

### Day 2 — BUILD: repo and service template

**Status:** `done` · **Hours:** 6 · **Needs:** Day 1 ADR

**Goal:** empty but real repo that lint/test/build can run.

#### Build tasks

- [x] Create root folders: `services/`, `packages/`, `sdk/`, `infra/`, `deploy/`, `tests/`, `docs/`
- [x] Add `docs/adr/`, `docs/architecture/`, `docs/api/`, `docs/events/`, `docs/runbooks/`
- [x] Root README points to `project_details.md` and this roadmap
- [x] Add `.gitignore`, lint, format, typecheck, test scripts
- [x] Add `packages/contracts` as a buildable empty package
- [x] Add `services/_template` with `healthz` only. No identity / agent / voice yet
- [x] One command runs `lint`, `test`, `build`
- [x] Commit. Mention Slot 01

#### Done when

A new person can clone, install, run lint/test, and see the tree. No product feature yet. This is correct.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 02 — Local data plane

|        |                       |
| ------ | --------------------- |
| Days   | 3–4                   |
| Wave   | A                     |
| Status | `done`                |
| Read   | sections 9, 35, 51–52 |

**What we already have:** Compose data plane, ADR 0002, `make up` / `make smoke`, `docs/architecture/local-data-plane.md`.

**What we add now:** local Docker stand-ins for production stores, with health checks.

**Not now:** AWS Aurora / MSK / OpenSearch (Slot 29). Product tables. Only a connectivity smoke test.

**Why this slot is now:** every later service needs Postgres, Redis, Kafka, OpenSearch, and OTel. If each service invents its own DB, we will migrate for many days later.

---

### Day 3 — LEARN: which store for which job

**Status:** `done` · **Hours:** 6

**Goal:** one ADR that says what each store is for, and what must never go there.

#### Options — transactional data

| Option                               | Idea                                                     | Problem                                    |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------ |
| A. Mongo first                       | Flexible documents                                       | Weak for membership, versions, billing     |
| B. One Postgres for everything       | Simple                                                   | Search and event replay do not belong here |
| C. Aurora PostgreSQL, local Postgres | Users, orgs, agents, conversations, billing, permissions | This is the right transactional store      |

**We choose: C.** Why: transactions, constraints, and later read replicas fit well.

#### Options — cache / short state

| Option                            | Idea                                                  | Problem                                              |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| A. In-process memory              | Fast                                                  | Dies with the process. Bad for rate limits and locks |
| B. Redis / Valkey                 | Cache, sessions, rate limits, idempotency keys, locks | Good. Not the source of truth                        |
| C. Redis as conversation database | Fast                                                  | We will lose data                                    |

**We choose: B.** Why: Redis is never the system of record.

#### Options — async work

| Option                                     | Idea                        | Problem                            |
| ------------------------------------------ | --------------------------- | ---------------------------------- |
| A. Kafka for every job                     | Replay is strong            | Simple retries / DLQ become heavy  |
| B. SQS only                                | Good for jobs               | Weak for many consumers and replay |
| C. Kafka for business events, SQS for jobs | Each tool does its real job | This is the production split       |

**We choose: C.** Why: we learn both, and we use each one for the right work.

#### Options — search / vectors

| Option                                      | Idea              | Problem                                   |
| ------------------------------------------- | ----------------- | ----------------------------------------- |
| A. pgvector in primary DB                   | Fine for demo     | Search load hits transactional DB         |
| B. Pinecone/Qdrant + another search engine  | Two systems       | Extra cost and extra ops                  |
| C. OpenSearch for keyword + vector / hybrid | One search system | Also useful later for conversation search |

**We choose: C.**

#### Options — local run

| Option                           | Idea            | Problem                     |
| -------------------------------- | --------------- | --------------------------- |
| A. Develop only on AWS           | Cloud-real      | Slow. Breaks section 52     |
| B. Local Kubernetes from day 3   | Production-like | Too much YAML too early     |
| C. Docker Compose for daily work | Fast feedback   | Kubernetes comes in Slot 29 |

**We choose: C.**

#### Learn tasks

- [x] Write `docs/adr/0002-data-plane.md` — one short paragraph per store
- [x] Decide Compose names, ports, volumes (local data can be ephemeral)
- [x] Spike: start Postgres and Redis, connect with CLI
- [x] Write Day 4 LLD: `docker-compose.yml`, `make up` / `make down`, smoke test

#### Day notes

- Date:
- Result:
- Need for Day 4:

---

### Day 4 — BUILD: Docker Compose + smoke test

**Status:** `done` · **Hours:** 6

#### Build tasks

- [x] Compose: Postgres, Redis/Valkey, Kafka (KRaft), OpenSearch, OTel Collector, local SQS (LocalStack or ElasticMQ)
- [x] Healthchecks. `make up` waits until healthy
- [x] `make down` / `make logs`
- [x] Smoke test: write/read one record or message on each store. Fail if any store is down
- [x] Document ports in `docs/architecture/local-data-plane.md`
- [x] Do **not** create product tables yet

#### Done when

`make up` and the smoke test pass on a clean machine. The service template can use env URLs.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 03 — Shared platform libraries

|        |                            |
| ------ | -------------------------- |
| Days   | 5–6                        |
| Wave   | A                          |
| Status | `not_started`              |
| Read   | sections 38, 41–42, 44, 59 |

**What we already have:** repo + running local data plane.

**What we add now:** shared errors, logging, tracing, auth context, HTTP client (timeout / retry / circuit breaker), idempotency helpers.

**Not now:** real login (Slot 04). Product dashboards (Slot 28).

**Why this slot is now:** if Identity and Runtime use different error JSON, the gateway cannot show one API. Reliability must exist before the first LLM call.

---

### Day 5 — LEARN: shared standards

**Status:** `not_started` · **Hours:** 6

#### Options — errors

| Option                                          | Idea         | Problem                      |
| ----------------------------------------------- | ------------ | ---------------------------- |
| A. Raw strings / vendor errors                  | Fast         | Clients cannot handle errors |
| B. Each service has its own format              | Easy now     | Gateway becomes messy        |
| C. Shared error codes + HTTP map + `request_id` | One envelope | Best for a platform          |

**We choose: C.**

#### Options — tracing

| Option                               | Idea                  | Problem                                 |
| ------------------------------------ | --------------------- | --------------------------------------- |
| A. `console.log` IDs only            | Simple                | Cannot follow a request across services |
| B. One vendor APM only               | Fast                  | Hard to move                            |
| C. OpenTelemetry + W3C trace context | Traces, metrics, logs | Required by section 44                  |

**We choose: C.**

#### Options — outbound HTTP

| Option                                                                                                | Idea       | Problem                         |
| ----------------------------------------------------------------------------------------------------- | ---------- | ------------------------------- |
| A. Default fetch, no timeout                                                                          | Easy       | Process can hang                |
| B. Retry every call                                                                                   | Seems safe | Double charge, double tool call |
| C. Client wrapper: required timeout, retry only safe calls, backoff, circuit breaker, concurrency cap | Production | This is the bar                 |

**We choose: C.**

#### Options — auth context

| Option                                                                       | Idea                                       | Problem      |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ------------ |
| A. Pass `userId` in query                                                    | Easy                                       | Easy to fake |
| B. Internal token/header with `tenant_id`, `actor_id`, `roles`, `request_id` | Gateway checks, services trust the context | Safer        |

**We choose: B.** Internal services must not invent the user from the request body.

#### Learn tasks

- [ ] Write `docs/adr/0003-platform-libraries.md`
- [ ] Error envelope: `code`, `message`, `request_id`, `details`
- [ ] Span fields: `trace_id`, `span_id`, `request_id`, `tenant_id`, `agent_id`, `conversation_id`
- [ ] Spike: one OTel trace from template service to collector
- [ ] Day 6 LLD for `packages/errors`, `logging`, `tracing`, `auth`, `utilities`

#### Day notes

- Date:
- Result:
- Need for Day 6:

---

### Day 6 — BUILD: shared packages

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `packages/errors` + unit tests
- [ ] `packages/logging` JSON logs + redaction helper
- [ ] `packages/tracing` OTel bootstrap
- [ ] `packages/auth` context type + extractor (no password login yet)
- [ ] `packages/utilities`: timeout, retry + backoff, circuit breaker, idempotency key, Redis lock
- [ ] Template service sends one traced request and uses the error envelope
- [ ] Test: retry does **not** retry an unsafe POST

#### Done when

Another service can import these packages. Template service shows a trace in the local collector. Still no product domain.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 04 — Identity

|        |                    |
| ------ | ------------------ |
| Days   | 7–8                |
| Wave   | A                  |
| Status | `not_started`      |
| Read   | sections 12–13, 47 |

**What we already have:** auth _types_, not real users.

**What we add now:** users, login, tokens, API keys, first organization.

**Not now:** workspace RBAC matrix (Slot 05). Agent-scoped keys come with Agent service.

---

### Day 7 — LEARN: identity models

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                        | Idea                                                          | Problem                                                                 |
| --------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A. Only Auth0 / Clerk / Cognito               | Fast UI                                                       | Weak learning. Hard later for service identity, tool permissions, audit |
| B. Write our own crypto                       | Full control                                                  | Dangerous. Do not invent hashing or JWT algorithms                      |
| C. Our Identity Service + standard primitives | We own users/orgs APIs. argon2/bcrypt. JWT or opaque sessions | We can add OIDC/SSO later without replacing the service                 |

**We choose: C.** Why: identity is a domain, not a small login form.

#### Also choose

| Topic    | Options                         | We choose                                                                                 |
| -------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Session  | JWT only vs server session only | Short-lived access JWT + hashed refresh token. Session metadata in Redis so we can revoke |
| API keys | Store raw vs hash               | Hash at rest. Show the raw key only once                                                  |

#### Learn tasks

- [ ] Write `docs/adr/0004-identity.md`
- [ ] Short threat list: credential stuffing, token theft, key leak
- [ ] Spike: register/login against local Postgres
- [ ] Day 8 LLD: tables `users`, `organizations`, `org_memberships`, `api_keys`, `refresh_tokens`

#### Day notes

- Date:
- Result:
- Need for Day 8:

---

### Day 8 — BUILD: Identity Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/identity` from the template
- [ ] Register, login, logout/refresh, me
- [ ] Create organization + first owner
- [ ] API key issue / revoke
- [ ] Password hashing, token revocation
- [ ] Tests: wrong password, refresh reuse, IDOR on membership
- [ ] Healthz + migrations

#### Done when

We can create a user and org by API. Tokens work. Keys are hashed. Identity is its own service.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 05 — Workspace and tenancy

|        |                        |
| ------ | ---------------------- |
| Days   | 9–10                   |
| Wave   | A                      |
| Status | `not_started`          |
| Read   | sections 12–13, 41, 47 |

**What we already have:** users and organizations.

**What we add now:** workspaces, roles, permission checks. Every later query must be tenant-scoped.

**Not now:** tool RBAC (Slot 15). Billing plans (Slot 26).

---

### Day 9 — LEARN: multi-tenant isolation

**Status:** `not_started` · **Hours:** 6

#### Options — isolation

| Option                                      | Idea                                     | Problem                           |
| ------------------------------------------- | ---------------------------------------- | --------------------------------- |
| A. Database per tenant                      | Strong isolation                         | Too heavy for 10k orgs in 60 days |
| B. Schema per tenant                        | Medium isolation                         | Migrations hurt                   |
| C. Shared schema + `tenant_id` on every row | App and data layer always require tenant | Right for this SaaS scale         |

**We choose: C.** Hard rule: repository methods take `TenantContext`. It is not an optional filter.

#### Roles now

`Owner`, `Admin`, `Developer`, `Operator`, `Analyst`, `Human Agent`

#### Options — permissions

| Option                                               | Idea        | Problem                    |
| ---------------------------------------------------- | ----------- | -------------------------- |
| A. `if role === admin` everywhere                    | Fast        | Becomes a mess             |
| B. Permission strings like `workspace.agent.publish` | One checker | Tools can reuse this later |

**We choose: B.**

#### Learn tasks

- [ ] Write `docs/adr/0005-tenancy-and-rbac.md`
- [ ] One paragraph: Organization vs Workspace (they are not the same table)
- [ ] List IDOR test cases
- [ ] Day 10 LLD: tables, invite flow, role change, `requirePermission()`

#### Day notes

- Date:
- Result:
- Need for Day 10:

---

### Day 10 — BUILD: Workspace Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/workspace`
- [ ] Workspaces under an organization
- [ ] Members, invites, role changes
- [ ] `requirePermission` on every write route
- [ ] Tests: Workspace A member cannot read Workspace B. Analyst cannot publish (deny the permission now, even if publish is later)
- [ ] `TenantContext` in `packages/auth`

#### Done when

Tenancy is a platform rule. Wave A is complete.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE B — Core objects (Days 11–20)

**Wave goal:** a safe public API, plus the objects the platform must have. Still no LLM reply.

---

## Slot 06 — API gateway / BFF

|        |                       |
| ------ | --------------------- |
| Days   | 11–12                 |
| Wave   | B                     |
| Status | `not_started`         |
| Read   | sections 5, 36–38, 47 |

**What we already have:** Identity and Workspace as separate services.

**What we add now:** one public door: auth, tenant context, rate limit, request IDs, route to internal services.

**Not now:** AWS API Gateway / ALB (Slot 29). GraphQL. Widget public routes can be a group on this same gateway later.

---

### Day 11 — LEARN: how clients enter

**Status:** `not_started` · **Hours:** 6

#### Options — entry

| Option                                 | Idea                                      | Problem                             |
| -------------------------------------- | ----------------------------------------- | ----------------------------------- |
| A. Browser talks to every microservice | Direct                                    | CORS/auth explode. Easy tenant leak |
| B. Service mesh only                   | Good later inside EKS                     | Not a public door                   |
| C. API Gateway / BFF                   | Check JWT, rate limit, hide internal URLs | This is the public entry            |

**We choose: C.**

#### Options — rate limit

| Option                                 | Idea                     | Problem                    |
| -------------------------------------- | ------------------------ | -------------------------- |
| A. In-memory per process               | Simple                   | Wrong with many replicas   |
| B. Redis sliding window / token bucket | Key by IP, user, API key | Correct for multi-instance |

**We choose: B.**

Note: the gateway is **sync HTTP**. It may enqueue work, but the client first hop is HTTP.

#### Learn tasks

- [ ] Write `docs/adr/0006-api-gateway.md`
- [ ] Public URL map: `/v1/auth`, `/v1/workspaces`, later `/v1/agents`
- [ ] Spike: gateway checks JWT and calls identity `/me`
- [ ] Day 12 LLD middleware order: `request_id` → timeout → auth → tenant → rate limit → route

#### Day notes

- Date:
- Result:
- Need for Day 12:

---

### Day 12 — BUILD: gateway

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] One public HTTP server (later bind `0.0.0.0:$PORT` in cloud)
- [ ] Route to identity and workspace
- [ ] Redis rate limits
- [ ] 429 / 401 / 403 use the shared error envelope
- [ ] Tests: missing token, bad token, rate limit, `request_id` returned
- [ ] Start OpenAPI in `docs/api/`

#### Done when

All external clients use the gateway. Internal services are not public.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 07 — Agent service

|        |                 |
| ------ | --------------- |
| Days   | 13–14           |
| Wave   | B               |
| Status | `not_started`   |
| Read   | sections 10, 14 |

**What we already have:** a workspace that can own things.

**What we add now:** Agent object — name, instructions, model settings, environment, channel flags (config only).

**Not now:** publish/rollback (Slot 08). Runtime (Slot 11). Knowledge links (Slot 12).

---

### Day 13 — LEARN: the Agent object

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                  | Idea                                               | Problem                           |
| --------------------------------------- | -------------------------------------------------- | --------------------------------- |
| A. One JSON blob column                 | Quick                                              | Hard to query and version         |
| B. Workflow graph editor first          | Looks powerful                                     | We are not building n8n on day 13 |
| C. Agent with clear fields (section 10) | Relational fields. JSON only for open model params | This is the core object           |

**We choose: C.**

#### Environment

| Option                                              | Idea              | Problem                |
| --------------------------------------------------- | ----------------- | ---------------------- |
| A. Edit the same production row                     | Simple            | No safe publish        |
| B. `environment` now + immutable versions next slot | Draft is editable | Slot 08 completes this |

**We choose: B.**

#### Learn tasks

- [ ] Write `docs/adr/0007-agent-aggregate.md`
- [ ] List fields now vs later (knowledge IDs later, tools later)
- [ ] Day 14 LLD: CRUD, unique name per workspace, optimistic concurrency

#### Day notes

- Date:
- Result:
- Need for Day 14:

---

### Day 14 — BUILD: Agent Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/agent`
- [ ] Create / read / update / list / archive
- [ ] Fields: name, description, instructions, model, temperature/config, environment, channel flags
- [ ] Gateway routes `/v1/agents`
- [ ] Tests: cross-tenant deny, validation, archive vs delete
- [ ] Cache-aside read in Redis, short TTL, invalidate on update. Redis is not the source of truth

#### Done when

A workspace can manage agents. Nothing runs them yet.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 08 — Agent lifecycle and versions

|        |                 |
| ------ | --------------- |
| Days   | 15–16           |
| Wave   | B               |
| Status | `not_started`   |
| Read   | sections 11, 41 |

**What we already have:** editable agent rows.

**What we add now:** Draft → Testing → Staging → Production. Immutable published versions. Rollback.

**Not now:** runtime using the version (Slot 11). Eval gate on publish (Slot 25).

---

### Day 15 — LEARN: versioning

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                             | Idea                                                               | Problem                                    |
| -------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| A. Overwrite the agent row                         | Simple                                                             | No rollback, no compare, no audit          |
| B. Git repo per agent                              | Powerful                                                           | Hard to query                              |
| C. Immutable `agent_versions` + production pointer | Publish copies draft. Rollback moves pointer. Draft stays editable | Strong consistency on publish (section 41) |

**We choose: C.**

Also: publish must send `base_version`, so two people cannot publish a stale draft.

#### Learn tasks

- [ ] Write `docs/adr/0008-agent-versioning.md`
- [ ] Draw the state machine
- [ ] Day 16 LLD: publish, rollback, list, diff

#### Day notes

- Date:
- Result:
- Need for Day 16:

---

### Day 16 — BUILD: versions

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Version table. No update after insert
- [ ] Publish / rollback / list / get / diff
- [ ] Production pointer
- [ ] Tests: rollback moves pointer; published row cannot change; stale `base_version` cannot publish
- [ ] After publish, read from the **primary** DB, not a replica

#### Done when

Production points to an immutable version. Agent service is ready for runtime to read it.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 09 — Conversation service

|        |                |
| ------ | -------------- |
| Days   | 17–18          |
| Wave   | B              |
| Status | `not_started`  |
| Read   | sections 6, 21 |

**What we already have:** agents. Still no model messages.

**What we add now:** conversations, messages, participants, session state.

**Not now:** inbox (Slot 18). Widget (Slot 17).

---

### Day 17 — LEARN: conversation as a durable log

**Status:** `not_started` · **Hours:** 6

#### Options — where history lives

| Option                               | Idea                                       | Problem                          |
| ------------------------------------ | ------------------------------------------ | -------------------------------- |
| A. Redis only                        | Fast                                       | Not durable. Hard to search      |
| B. Store chat only at the LLM vendor | Easy                                       | We do not own history or handoff |
| C. Conversation Service in Postgres  | Redis may hold a short session cursor only | We own the log                   |

**We choose: C.**

#### Options — how we append

| Option                          | Idea             | Problem                 |
| ------------------------------- | ---------------- | ----------------------- |
| A. One big JSON array           | Simple           | Lost updates. Huge rows |
| B. Append-only `messages` table | Ordered by `seq` | Production pattern      |

**We choose: B.**

#### Learn tasks

- [ ] Write `docs/adr/0009-conversations.md`
- [ ] States: `active`, `waiting_human`, `resolved`, `failed`
- [ ] Day 18 LLD: create, append, list, pagination

#### Day notes

- Date:
- Result:
- Need for Day 18:

---

### Day 18 — BUILD: Conversation Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/conversation`
- [ ] Create conversation for workspace + agent version
- [ ] Append user / assistant / system / tool messages
- [ ] List with pagination
- [ ] Participants: customer, ai, later human
- [ ] Tests: cannot append to another tenant; `seq` goes up only
- [ ] Gateway routes

#### Done when

History lives without the LLM. Runtime will write here. Runtime will not make a second store.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 10 — Model gateway

|        |                     |
| ------ | ------------------- |
| Days   | 19–20               |
| Wave   | B                   |
| Status | `not_started`       |
| Read   | sections 17, 32, 38 |

**What we already have:** no LLM calls yet. This is on purpose.

**What we add now:** provider abstraction, timeout, retry, fallback, token / cost hooks.

**Not now:** agent loop (Slot 11). Billing invoices (Slot 26). Only a usage port.

---

### Day 19 — LEARN: do not lock to one vendor

**Status:** `not_started` · **Hours:** 6

#### Options — gateway

| Option                                         | Idea                                    | Problem                                             |
| ---------------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| A. Call OpenAI / Groq / Anthropic from runtime | Fast                                    | First outage forces a rewrite                       |
| B. LiteLLM as the product                      | Useful adapter                          | We still need our policy, tenancy, and cost records |
| C. Our Model Gateway                           | Our interface. Inside we may use an SDK | Platform boundary is ours                           |

**We choose: C.**

#### Options — fallback

| Option                                                                | Idea         | Problem     |
| --------------------------------------------------------------------- | ------------ | ----------- |
| A. Fail at once                                                       | Simple       | Bad UX      |
| B. Retry same model forever                                           | Seems strong | Retry storm |
| C. Timeout → retry once if safe → fallback model if set → typed error | Controlled   | Production  |

**We choose: C.**

#### Learn tasks

- [ ] Write `docs/adr/0010-model-gateway.md`
- [ ] Choose first **two** providers, not ten
- [ ] Spike: streaming and non-streaming completion
- [ ] Day 20 LLD: `complete`, `stream`, usage callback, mapped errors

#### Day notes

- Date:
- Result:
- Need for Day 20:

---

### Day 20 — BUILD: Model Gateway

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/model-gateway`
- [ ] Provider interface + two providers
- [ ] Timeouts, limited retries, fallback
- [ ] Record token usage (table or port for Slot 26)
- [ ] Tests: timeout triggers fallback; unknown model = 400; API key never logged
- [ ] No tenant data in vendor logs

#### Done when

Runtime can call one internal model API. Wave B is complete. Next wave: the agent talks.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE C — Working agent (Days 21–30)

**Wave goal:** a tenant can run a versioned agent on a conversation, with knowledge, memory, and tools. Still no public widget.

---

## Slot 11 — Agent runtime

|        |               |
| ------ | ------------- |
| Days   | 21–22         |
| Wave   | C             |
| Status | `not_started` |
| Read   | section 16    |

**What we already have:** agent versions, conversations, model gateway.

**What we add now:** loop = load config → load history → call model → stream tokens → save assistant message.

**Not now:** retrieval (Slot 13), tools (Slot 15). Add empty ports so we do not rewrite the loop later.

---

### Day 21 — LEARN: a runtime we can extend

**Status:** `not_started` · **Hours:** 6

#### Options — runtime

| Option                              | Idea                     | Problem                                                     |
| ----------------------------------- | ------------------------ | ----------------------------------------------------------- |
| A. LangChain / LangGraph as runtime | Fast graphs              | Weak control of cancel, tenancy, tracing. High rewrite risk |
| B. One big function in the API      | Works today              | Cannot scale as its own service                             |
| C. Our Agent Runtime service        | Fixed pipeline of stages | Later slots add retrieve / memory / tools                   |

**We choose: C.**

#### Options — streaming

| Option                                                      | Idea      | Problem                    |
| ----------------------------------------------------------- | --------- | -------------------------- |
| A. Wait for full answer                                     | Simple    | Chat and voice feel dead   |
| B. Stream tokens through gateway. Save final message at end | Better UX | Needed for voice later too |

**We choose: B.**

Also: per-tenant and per-agent concurrency limits in Redis. One customer must not eat all LLM budget.

#### Learn tasks

- [ ] Write `docs/adr/0011-agent-runtime.md`
- [ ] Draw the loop with empty ports: `Retriever`, `MemoryStore`, `ToolExecutor`
- [ ] Spike: stream tokens from model gateway to curl
- [ ] Day 22 LLD: `run` / `stream`, cancel, context trim

#### Day notes

- Date:
- Result:
- Need for Day 22:

---

### Day 22 — BUILD: Runtime Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/runtime`
- [ ] Load published (or specified) agent version
- [ ] Load conversation history
- [ ] Call model gateway
- [ ] Stream to caller. Save final assistant message
- [ ] Timeouts, cancel, simple context trim
- [ ] Tests: uses published version, not stale draft; other tenant rejected; timeout is a typed error
- [ ] Gateway: `POST /v1/conversations/:id/messages` streams

#### Done when

A logged-in user can do multi-turn chat with a production agent version. No RAG. No tools. This is the spine.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 12 — Knowledge ingestion

|        |                     |
| ------ | ------------------- |
| Days   | 23–24               |
| Wave   | C                   |
| Status | `not_started`       |
| Read   | sections 15, 35, 37 |

**What we already have:** agents that answer from instructions only.

**What we add now:** source → parse → chunk → embed → index. Async jobs. Status and retries. **Answers do not change yet.**

**Not now:** retrieval in the loop (Slot 13).

---

### Day 23 — LEARN: ingestion pipeline

**Status:** `not_started` · **Hours:** 6

#### Options — jobs

| Option                                           | Idea           | Problem                                      |
| ------------------------------------------------ | -------------- | -------------------------------------------- |
| A. Embed on the HTTP request                     | Simple         | PDF will time out                            |
| B. Threads inside the API process                | No extra queue | Dies with the pod. No DLQ                    |
| C. Knowledge Service + SQS + DLQ + source status | Async          | Section 37 says document processing is async |

**We choose: C.**

#### Options — chunking

| Option                                         | Idea                     | Problem                |
| ---------------------------------------------- | ------------------------ | ---------------------- |
| A. Fixed character slices only                 | Easy                     | Breaks meaning         |
| B. Structure-aware chunks + overlap + metadata | `source_id`, `tenant_id` | Better retrieval later |

**We choose: B.** Embeddings go to **OpenSearch**, not Postgres. If a source is deleted, chunks must be deleted too.

#### Learn tasks

- [ ] Write `docs/adr/0012-knowledge-ingestion.md`
- [ ] Spike: parse a PDF and a URL, chunk, embed one batch
- [ ] Day 24 LLD: source types, job states `queued` / `processing` / `ready` / `failed`

#### Day notes

- Date:
- Result:
- Need for Day 24:

---

### Day 24 — BUILD: Knowledge Service (ingest only)

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/knowledge`
- [ ] Upload / text / URL. Store files in S3-compatible local store (prefer MinIO)
- [ ] SQS worker
- [ ] Chunk + embed + index. Every document has `tenant_id`
- [ ] Re-index and delete-propagation
- [ ] Tests: failed parse → retry → DLQ; delete source removes chunks; tenant field always set
- [ ] Link table: agent ↔ knowledge collection (link only)

#### Done when

Documents are in the search index. Runtime still does not retrieve. That is the next slot.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 13 — Retrieval in the runtime

|        |                |
| ------ | -------------- |
| Days   | 25–26          |
| Wave   | C              |
| Status | `not_started`  |
| Read   | sections 15–16 |

**What we already have:** an index, and a runtime `Retriever` port.

**What we add now:** hybrid retrieve → rerank → citations, inside the **same** loop.

**Not now:** retrieval eval (Slot 25). Conversation search UI.

---

### Day 25 — LEARN: retrieval we can explain

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                        | Idea     | Problem                               |
| ----------------------------------------------------------------------------- | -------- | ------------------------------------- |
| A. Put the whole corpus in the prompt                                         | Simple   | Dies with real document size          |
| B. Vector-only kNN                                                            | Semantic | Misses exact tokens (order IDs, SKUs) |
| C. Hybrid lexical + vector, then rerank, then limited context, with citations | Balanced | Production RAG                        |

**We choose: C.** Tenant filter is a **hard filter**, not a prompt sentence.

#### Learn tasks

- [ ] Write `docs/adr/0013-retrieval.md`
- [ ] Spike: hybrid query + rerank on a tiny corpus
- [ ] Day 26 LLD: runtime stage, citation schema, debug retrieve API

#### Day notes

- Date:
- Result:
- Need for Day 26:

---

### Day 26 — BUILD: retrieve stage

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `Retriever` in knowledge service
- [ ] Runtime calls retrieve when the agent has collections
- [ ] Citations on the assistant message
- [ ] Debug retrieve API for operators
- [ ] Tests: Tenant A cannot get Tenant B chunks; agent with no collections skips retrieve

#### Done when

Answers can use company knowledge. Same loop as Slot 11, plus one stage.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 14 — Memory

|        |               |
| ------ | ------------- |
| Days   | 27–28         |
| Wave   | C             |
| Status | `not_started` |
| Read   | section 20    |

**What we already have:** knowledge (org facts) and conversation history (short-term).

**What we add now:** long-term memory. Not a document. Not the full transcript.

**Not now:** a new vector product. Reuse OpenSearch or Postgres.

---

### Day 27 — LEARN: three stores, three jobs

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                          | Idea                            | Problem                                        |
| ----------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| A. Save memory as more RAG documents            | Easy                            | Mixes "user likes dark mode" into company docs |
| B. Always dump summaries into the system prompt | Easy                            | Grows forever. Stale. Hard to delete           |
| C. Separate memory records per customer/agent   | TTL, retrieve a few, forget API | Clear split                                    |

**We choose: C.**

Keep separate:

- short-term → Conversation Service (+ optional Redis cursor)
- knowledge → Knowledge Service
- long-term memory → memory records

Do not merge the three tables.

#### Learn tasks

- [ ] Write `docs/adr/0014-memory.md`
- [ ] Decide: extract-on-turn vs explicit "remember this"
- [ ] Day 28 LLD: memory table, retrieve-k, write after turn, forget API

#### Day notes

- Date:
- Result:
- Need for Day 28:

---

### Day 28 — BUILD: memory stage

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Memory records keyed by tenant + customer + agent
- [ ] Runtime stage: read memories, maybe write new ones
- [ ] Forget / list APIs
- [ ] Tests: no leak across tenants or customers; knowledge delete does not wipe memory

#### Done when

The three storage problems are separate in code and in docs.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 15 — Tools and MCP

|        |                 |
| ------ | --------------- |
| Days   | 29–30           |
| Wave   | C               |
| Status | `not_started`   |
| Read   | sections 18, 13 |

**What we already have:** a runtime that can talk and retrieve. It cannot act.

**What we add now:** common tool interface, internal tools, HTTP tools, MCP, permissions, timeouts.

**Not now:** secrets backend (Slot 16). Tools may store secret _ids_ only.

---

### Day 29 — LEARN: tools as a platform

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                      | Idea                                                                                               | Problem                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A. `if (name === "create_lead")` in runtime | Fast                                                                                               | Every new tool needs a runtime deploy            |
| B. Model may call any URL                   | Flexible                                                                                           | Prompt injection can steal data or call bad APIs |
| C. Tool / Integration Service               | Register name, schema, auth ref, permissions, timeout, retry. Runtime runs only allow-listed tools | Production                                       |

**We choose: C.**

MCP is a **tool transport**. It is not a second permission system.

Example: agent may `read_customer`. Agent may not `issue_large_refund`.

#### Learn tasks

- [ ] Write `docs/adr/0015-tools.md`
- [ ] Spike: one MCP tool and one HTTP tool
- [ ] Day 30 LLD: register, execute, audit line, schema validation

#### Day notes

- Date:
- Result:
- Need for Day 30:

---

### Day 30 — BUILD: Tool Service + tool loop

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/tools`
- [ ] Register / list tools. Attach to agent version
- [ ] Execute with schema check, timeout, permission check
- [ ] Runtime: model tool call → execute → model → answer (same loop, new stage)
- [ ] Tests: denied permission never fires; bad JSON never hits HTTP; Tenant A tool not usable by Tenant B
- [ ] MCP adapter for at least one server

#### Done when

Wave C is complete. A production agent can use knowledge, memory, and tools. No public widget yet.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE D — Channel and operations (Days 31–40)

**Wave goal:** customers chat on a website. Humans can take over. Events and workflows become the backbone.

---

## Slot 16 — Secrets

|        |                 |
| ------ | --------------- |
| Days   | 31–32           |
| Wave   | D               |
| Status | `not_started`   |
| Read   | sections 19, 47 |

**What we already have:** tools that point to credentials.

**What we add now:** managed secrets, encryption, rotation metadata, masking.

**Not now:** AWS Secrets Manager wiring (Slot 29 can swap the backend). The interface stays the same.

---

### Day 31 — LEARN: secrets are not env files

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                      | Idea                                                     | Problem                          |
| --------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------- |
| A. Plain env / config JSON                                                  | Easy                                                     | Keys land in tickets and logs    |
| B. Encrypt in Postgres, key in env                                          | Better                                                   | Weak rotation and access control |
| C. Secrets interface → local encrypted store now, AWS Secrets Manager later | Envelope encryption, access control, audit, mask on read | Production path                  |

**We choose: C.** After create, show the raw secret only once. Never in list APIs.

#### Learn tasks

- [ ] Write `docs/adr/0016-secrets.md`
- [ ] Spike: encrypt / decrypt with a local KMS-like key
- [ ] Day 32 LLD: secret id for tools, rotation field

#### Day notes

- Date:
- Result:
- Need for Day 32:

---

### Day 32 — BUILD: secrets

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Store / rotate / revoke
- [ ] Tool execution resolves secret id at runtime
- [ ] Mask in API and logs
- [ ] Tests: list endpoint has no secret body; unauthorized cannot read; rotation clears cache

#### Done when

Integrations can be production-safe. Widget work can start.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 17 — Website chat widget

|        |                 |
| ------ | --------------- |
| Days   | 33–34           |
| Wave   | D               |
| Status | `not_started`   |
| Read   | sections 23, 24 |

**What we already have:** a complete server-side agent. No customer channel.

**What we add now:** embed widget — stream, history, typing, reconnect, tool-call events, optional visitor auth.

**Not now:** inbox UI (Slot 18). Voice. Marketing site extra polish.

---

### Day 33 — LEARN: a real widget

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                 | Idea                             | Problem                  |
| ---------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| A. iframe to dashboard chat                                            | Easy                             | Ugly. Auth and CSS pain  |
| B. Big JS snippet with secret keys                                     | Fast                             | Keys leak in the browser |
| C. Widget package + publishable key + origin allowlist + streaming API | Secret keys never in the browser | Production               |

**We choose: C.**

Reconnect: client keeps `conversation_id` + last `seq`, then loads missed messages. Do not start a new conversation on every refresh if the visitor is known.

Prefer **SSE for tokens** + REST to send, unless we need full duplex. Then WebSocket. Pick one and keep it.

#### Learn tasks

- [ ] Write `docs/adr/0017-website-chat.md`
- [ ] Spike SSE vs WebSocket. Choose one
- [ ] Day 34 LLD: widget packages, embed snippet, origin allowlist, visitor session

#### Day notes

- Date:
- Result:
- Need for Day 34:

---

### Day 34 — BUILD: widget + public chat API

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Public chat routes on the gateway (publishable key, origin check)
- [ ] Streaming, typing, tool-call events
- [ ] Reconnect with history
- [ ] React embed + thin vanilla embed
- [ ] Tests: bad origin rejected; secret key rejected on browser path; tenant isolation by key

#### Done when

A real website can embed the agent. This is the first customer channel.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 18 — Inbox and human handoff

|        |                |
| ------ | -------------- |
| Days   | 35–36          |
| Wave   | D              |
| Status | `not_started`  |
| Read   | sections 21–22 |

**What we already have:** AI conversations. No human operator screen.

**What we add now:** unified inbox, assignment, AI → human, human → AI, escalation reason.

**Not now:** shift scheduling.

---

### Day 35 — LEARN: human is a participant

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                       | Idea                        | Problem              |
| ------------------------------------------------------------ | --------------------------- | -------------------- |
| A. Copy transcript into a ticket product                     | Looks like support          | Two sources of truth |
| B. Stop chat and email someone                               | Simple                      | Not an inbox         |
| C. Same conversation, new participant, state `waiting_human` | Runtime pauses until return | One transcript       |

**We choose: C.** Claim/release with optimistic locking, so two humans do not take the same thread.

#### Learn tasks

- [ ] Write `docs/adr/0018-inbox-handoff.md`
- [ ] Day 36 LLD: inbox query, assign, escalate, return-to-ai, operator message

#### Day notes

- Date:
- Result:
- Need for Day 36:

---

### Day 36 — BUILD: inbox

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Inbox list: customer, channel, agent, status, assignee, escalation reason
- [ ] Takeover and return
- [ ] Human messages on the same transcript
- [ ] Runtime respects `waiting_human` (no auto answer)
- [ ] Tests: two claims, tenant isolation, AI silent while waiting
- [ ] A usable operator UI or a clear API-first UI

#### Done when

Ops can run the chat channel. Next slot can emit real events.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 19 — Event platform

|        |                        |
| ------ | ---------------------- |
| Days   | 37–38                  |
| Wave   | D                      |
| Status | `not_started`          |
| Read   | sections 8, 29, 35, 37 |

**What we already have:** real domain actions that should emit events.

**What we add now:** Kafka topics, producers, consumers, idempotency, DLQ, replay notes.

**Not now:** workflow graph (Slot 20). Billing consumer (Slot 26) can be a stub.

---

### Day 37 — LEARN: events are not a second database

**Status:** `not_started` · **Hours:** 6

#### Options — bus

| Option                                           | Idea           | Problem                          |
| ------------------------------------------------ | -------------- | -------------------------------- |
| A. Webhooks only                                 | Easy           | No replay. Weak internal fan-out |
| B. SQS for all business events                   | Good retries   | Weak for many consumers + replay |
| C. Kafka for business events, SQS still for jobs | Durable events | Production split                 |

**We choose: C.**

The service that owns the write emits the event.

#### Options — outbox

| Option                        | Idea                                                                                         | Problem                  |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ------------------------ |
| A. Emit after commit and hope | Fast                                                                                         | Lost or duplicate events |
| B. Transactional outbox       | Same Postgres transaction writes the row. Publisher sends to Kafka. Consumers are idempotent | Production events        |

**We choose: B.** This is the difference between demo events and production events.

#### Learn tasks

- [ ] Write `docs/adr/0019-events.md`
- [ ] Catalog events we can emit **now**: `agent.created`, `agent.updated`, `conversation.started`, `message.created`, `tool.called`, `tool.failed`, `agent.escalated`
- [ ] Day 38 LLD: outbox table, publisher, sample consumer group, idempotency store

#### Day notes

- Date:
- Result:
- Need for Day 38:

---

### Day 38 — BUILD: events

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Outbox + publisher in agent, conversation, tools, runtime
- [ ] Topics keyed/partitioned by `tenant_id` (or document the key)
- [ ] One idempotent consumer (analytics or notification stub)
- [ ] DLQ for bad messages
- [ ] Tests: duplicate delivery does not double-apply; replay is documented
- [ ] Event catalog in `docs/events/`

#### Done when

New features emit events. They do not invent extra side callbacks.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 20 — Workflow automation

|        |               |
| ------ | ------------- |
| Days   | 39–40         |
| Wave   | D             |
| Status | `not_started` |
| Read   | section 30    |

**What we already have:** events. Leads do not exist yet. Build the **engine** on events we have, like `agent.escalated`.

**What we add now:** trigger → condition → action, with retry, state, idempotency, timeout.

**Not now:** campaign / lead actions (Slots 23–24). Do not fake those domains today.

---

### Day 39 — LEARN: a workflow engine we can explain

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                    | Idea                                            | Problem                      |
| ------------------------- | ----------------------------------------------- | ---------------------------- |
| A. Temporal / Cadence now | Great for long-running work                     | Extra platform in 6 hours    |
| B. n8n / Zapier embed     | Fast                                            | Not our reliability story    |
| C. Our Workflow Service   | Kafka trigger, JSON condition, SQS step retries | We can explain every failure |

**We choose: C for 60 days.** Write in the ADR: Temporal is the later upgrade if we need very long timers.

Idempotency: `workflow_run_id` + step key. Replay must not call the customer twice.

#### Learn tasks

- [ ] Write `docs/adr/0020-workflows.md`
- [ ] Design one real workflow: `agent.escalated` → notify (log/email stub)
- [ ] Day 40 LLD: definitions, runs, steps, timeout, DLQ

#### Day notes

- Date:
- Result:
- Need for Day 40:

---

### Day 40 — BUILD: Workflow Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/workflow`
- [ ] CRUD definitions with permissions
- [ ] Runner consumes Kafka, enqueues steps
- [ ] Retry, timeout, failed end state
- [ ] Tests: duplicate event → one run; step retry; false condition skips action
- [ ] Action ports for later campaign / lead / voice

#### Done when

Wave D is complete. Automation exists. Voice can be a new channel. We do not redesign chat.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE E — Voice and growth (Days 41–50)

**Wave goal:** the same agent works on the phone. We can run campaigns, qualify leads, and measure quality.

---

## Slot 21 — Voice path

|        |                |
| ------ | -------------- |
| Days   | 41–42          |
| Wave   | E              |
| Status | `not_started`  |
| Read   | sections 7, 25 |

**What we already have:** runtime, conversations, tools. No audio.

**What we add now:** PSTN/SIP → telephony → voice gateway → realtime session → STT → runtime → TTS → audio. Inbound and outbound call lifecycle.

**Not now:** barge-in, voicemail policy, campaign dialer (Slots 22–23). First get a **working call**.

---

### Day 41 — LEARN: realtime is a different subsystem

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                            | Idea               | Problem                                   |
| --------------------------------------------------------------------------------- | ------------------ | ----------------------------------------- |
| A. Record whole call, then transcribe, then answer                                | Easy               | Not a voice agent                         |
| B. Vendor "AI phone" with no our runtime                                          | Fast               | Cannot reuse tools / knowledge / versions |
| C. Our Voice Service + vendor telephony + STT/TTS stream + **same Agent Runtime** | Reuse the platform | Production                                |

**We choose: C.**

Provider choice goes in the ADR. Use one stack we can actually run (example: Twilio, or SIP + Deepgram + TTS vendor). The **session state machine** is ours.

Calls create conversations with `channel=voice`. Do not make a second history table.

#### Learn tasks

- [ ] Write `docs/adr/0021-voice-path.md`
- [ ] Latency budget: audio → STT → runtime/LLM → TTS
- [ ] Spike: one inbound test call, or a local audio loop if PSTN is not available
- [ ] Day 42 LLD: call states, media, conversation link

#### Day notes

- Date:
- Result:
- Need for Day 42:

---

### Day 42 — BUILD: Voice Service (happy path)

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/voice`
- [ ] Inbound webhook / SIP entry
- [ ] Outbound originate API
- [ ] Stream STT → runtime turn → TTS
- [ ] Call record: ids, tenant, agent version, conversation id, state
- [ ] Events: `call.started` (and `call.completed` if time)
- [ ] Tests: tenant on every call; runtime failure ends the call in a known state

#### Done when

We can place or receive a call. The **same** agent version talks. Reliability is tomorrow, not a rebuild.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 22 — Voice reliability

|        |               |
| ------ | ------------- |
| Days   | 43–44         |
| Wave   | E             |
| Status | `not_started` |
| Read   | section 26    |

**What we already have:** happy-path voice.

**What we add now:** VAD, barge-in, recording, transcripts, provider failure, silence, reconnect, transfer, concurrency limits.

**Not now:** campaign pacing (Slot 23).

---

### Day 43 — LEARN: voice failure matrix

**Status:** `not_started` · **Hours:** 6

For each dependency, write:

1. What fails?
2. How do we detect it?
3. What happens now?
4. Do we retry?
5. Do we fallback?
6. How do we recover?
7. How do we check data after?

Cover: STT timeout, TTS failure, LLM latency, caller disconnect, barge-in, silence, transfer failure.

#### Options — barge-in

| Option                                                                       | Idea       | Problem                                |
| ---------------------------------------------------------------------------- | ---------- | -------------------------------------- |
| A. Ignore barge-in                                                           | Simple     | User talks over long TTS. Feels broken |
| B. On VAD speech, stop TTS, cancel in-flight LLM if needed, start a new turn | Real voice | Production                             |

**We choose: B.** Recording audio goes to S3. Transcript goes on the conversation. Not a mystery blob in Redis.

#### Learn tasks

- [ ] Write `docs/adr/0022-voice-reliability.md`
- [ ] Latency metrics list
- [ ] Day 44 LLD: VAD, interrupt, record, transfer, Redis concurrency semaphore

#### Day notes

- Date:
- Result:
- Need for Day 44:

---

### Day 44 — BUILD: reliable voice

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] VAD + barge-in
- [ ] Recording + transcript save
- [ ] Transfer with failure state
- [ ] Concurrency limits
- [ ] Metrics hooks for STT / LLM / TTS latency
- [ ] Test or fixture: disconnect mid-TTS; STT timeout fallback line
- [ ] `call.completed` with outcome

#### Done when

Voice is a production subsystem, not a demo ringtone.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 23 — Outbound campaigns

|        |               |
| ------ | ------------- |
| Days   | 45–46         |
| Wave   | E             |
| Status | `not_started` |
| Read   | section 27    |

**What we already have:** outbound call API + events.

**What we add now:** campaign, audience, schedule, timezone, pacing, retries, pause/resume, outcomes, opt-out.

**Not now:** lead scoring (Slot 24). Audience can be CSV/API.

---

### Day 45 — LEARN: a dialer is a queue with rules

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                | Idea                                                                        | Problem                         |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------- |
| A. For-loop calls in one HTTP request | Fast                                                                        | Process dies. Double-dial       |
| B. Cron dumps all calls at 09:00      | Simple                                                                      | No pacing, timezone, or opt-out |
| C. Campaign Service                   | Audience rows, scheduler, SQS work, Redis concurrency, idempotent dial keys | Production                      |

**We choose: C.** Check opt-out **at dial time**, not only at import.

#### Learn tasks

- [ ] Write `docs/adr/0023-campaigns.md`
- [ ] Day 46 LLD: states, schedule, retry, stats (eventual consistency is OK for counters)

#### Day notes

- Date:
- Result:
- Need for Day 46:

---

### Day 46 — BUILD: Campaign Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/campaign`
- [ ] Audience import, timezone, start / pause / resume
- [ ] Worker dials through Voice Service
- [ ] Outcomes: answered, no-answer, voicemail, failed, opted_out
- [ ] Events: `campaign.started`, `campaign.completed`
- [ ] Tests: pause stops new dials; opt-out never dials; duplicate work item does not double-dial

#### Done when

Outbound voice is a campaign, not one API click.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 24 — Lead generation

|        |               |
| ------ | ------------- |
| Days   | 47–48         |
| Wave   | E             |
| Status | `not_started` |
| Read   | section 28    |

**What we already have:** campaigns, and agents that can qualify.

**What we add now:** lead object, source, score hook, campaign enroll, CRM update as tool/event.

**Not now:** a full CRM product.

---

### Day 47 — LEARN: leads are a domain

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                  | Idea                                                         | Problem                    |
| --------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| A. Store leads as conversation metadata | No new service                                               | Hard to score and campaign |
| B. Lead Service                         | Status, score, owner, source, links to conversation/campaign | Clear domain               |

**We choose: B.**

Flow: source → `lead.created` → workflow can run qualification agent → score → maybe enroll campaign → CRM tool.

#### Learn tasks

- [ ] Write `docs/adr/0024-leads.md`
- [ ] Day 48 LLD: lead APIs, score field, workflow action `enroll_campaign`

#### Day notes

- Date:
- Result:
- Need for Day 48:

---

### Day 48 — BUILD: leads

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Lead CRUD + status changes
- [ ] `lead.created` / `lead.updated`
- [ ] Workflow: created → qualify → if score > threshold, enroll campaign
- [ ] CRM update through tools
- [ ] Tests: tenant isolation; duplicate `lead.created` is idempotent

#### Done when

Growth loop sits on agents + events + workflows + campaigns.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 25 — Evaluation

|        |                 |
| ------ | --------------- |
| Days   | 49–50           |
| Wave   | E               |
| Status | `not_started`   |
| Read   | sections 31, 55 |

**What we already have:** a real agent with versions. We have been changing it without numbers.

**What we add now:** datasets, runners, scores, compare versions.

---

### Day 49 — LEARN: measure, do not guess

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                                  | Idea                                                     | Problem             |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| A. Click around the dashboard                                                           | Fast                                                     | Not regression      |
| B. LLM-as-judge only                                                                    | Useful for open answers                                  | Noisy. Easy to game |
| C. Golden dataset + deterministic checks + optional LLM judge + latency/failure metrics | Input, expected behavior, expected tool, expected answer | Production eval     |

**We choose: C.** Eval runs are SQS jobs, not a 10-minute HTTP request.

#### Learn tasks

- [ ] Write `docs/adr/0025-evaluation.md`
- [ ] Day 50 LLD: dataset, case, run, scores, compare vN vs vN+1

#### Day notes

- Date:
- Result:
- Need for Day 50:

---

### Day 50 — BUILD: Evaluation Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/evaluation`
- [ ] Import dataset. Run against an agent version offline (no live traffic)
- [ ] Metrics: correctness, tool selection, retrieval hit if used, latency, failure rate
- [ ] Report like: v10 87% vs v11 92%
- [ ] Tests: same dataset + same version is stable enough; tenant datasets isolated

#### Done when

Wave E is complete. Quality is a number. We can compare a change.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE F — Harden and ship (Days 51–60)

**Wave goal:** money, audit, ops, cloud, proof. Do not add a new product domain unless the coverage map shows a hole.

---

## Slot 26 — Usage, cost, and billing

|        |                |
| ------ | -------------- |
| Days   | 51–52          |
| Wave   | F              |
| Status | `not_started`  |
| Read   | sections 32–33 |

**What we already have:** token hooks, voice minutes, tool executions, conversations.

**What we add now:** meters by org / agent / campaign / conversation / model / provider. Then plans, quotas, credits, subscription status, invoices, overage.

---

### Day 51 — LEARN: ledger first, Stripe second

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                    | Idea          | Problem                          |
| ------------------------------------------------------------------------- | ------------- | -------------------------------- |
| A. Stripe as source of truth for AI/voice usage                           | Fast checkout | Hard to meter tokens and minutes |
| B. Our usage ledger + billing view. Stripe (or stub) for collection later | We own meters | Production billing foundation    |

**We choose: B.** Ledger writes are **strongly consistent**. Dashboard rollups may be eventual. Quota checks use Redis counters fed from the ledger.

#### Learn tasks

- [ ] Write `docs/adr/0026-usage-billing.md`
- [ ] Map each meter to an existing emitter
- [ ] Day 52 LLD: `services/usage`, invoice model, quota middleware

#### Day notes

- Date:
- Result:
- Need for Day 52:

---

### Day 52 — BUILD: Usage / Billing Service

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Ingest usage from model gateway, voice, tools, embeddings
- [ ] Query by org / agent / campaign / conversation / model / provider
- [ ] Plans, quotas, credits, subscription status, invoice records, overage flag
- [ ] Enforce a quota on runtime / gateway
- [ ] Tests: Tenant A usage never shows in B; quota trip is deterministic

#### Done when

Cost is visible and we can limit it. Fancy tax / dunning is not required.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 27 — Audit and security

|        |                 |
| ------ | --------------- |
| Days   | 53–54           |
| Wave   | F               |
| Status | `not_started`   |
| Read   | sections 34, 47 |

**What we already have:** many write APIs, almost no immutable audit trail.

**What we add now:** Audit Service + security hardening.

---

### Day 53 — LEARN: audit vs logs vs traces

**Status:** `not_started` · **Hours:** 6

#### Options — audit

| Option                                 | Idea                                                                   | Problem                   |
| -------------------------------------- | ---------------------------------------------------------------------- | ------------------------- |
| A. Grep logs                           | Easy                                                                   | Not an audit system       |
| B. Audit rows only inside each service | Local                                                                  | Hard to query tenant-wide |
| C. Audit Service consumes audit events | Actor, tenant, action, resource, time, request_id, metadata. Immutable | Production                |

**We choose: C.**

#### Service-to-service auth

| Option                          | Idea            | We choose              |
| ------------------------------- | --------------- | ---------------------- |
| Open cluster DNS                | Too open        | No                     |
| Signed internal JWT or HMAC now | Good enough now | **Yes**                |
| mTLS on EKS later               | Stronger        | If time after JWT/HMAC |

Also learn: prompt injection, retrieval poisoning, why tools stay allow-listed, IDOR, secret leak, cross-tenant search.

#### Learn tasks

- [ ] Write `docs/adr/0027-audit-and-security.md`
- [ ] Threat pass: IDOR, prompt leak, secret leak, cross-tenant search
- [ ] Day 54 LLD: audit API + the action list from section 34

#### Day notes

- Date:
- Result:
- Need for Day 54:

---

### Day 54 — BUILD: Audit Service + hardening

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] `services/audit`
- [ ] Record: login, agent change/publish, tool create, permission, secret, workflow, campaign start/stop, assignment
- [ ] Query API for operators
- [ ] Internal auth on all service-to-service calls
- [ ] Prompt-injection test: hostile text cannot run a tool that is not allow-listed
- [ ] PII redaction pass on logs
- [ ] Rate limit / WAF notes for cloud

#### Done when

Security is enforced and we have evidence. We do not only assume it.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 28 — Observability, alerts, notifications

|        |                    |
| ------ | ------------------ |
| Days   | 55–56              |
| Wave   | F                  |
| Status | `not_started`      |
| Read   | sections 44–46, 36 |

**What we already have:** OTel hooks from Slot 03, some metrics. Incomplete dashboards. No alert policy.

**What we add now:** full metric set, alert rules, Notification Service.

---

### Day 55 — LEARN: signals we will act on

**Status:** `not_started` · **Hours:** 6

#### Options — alerts

| Option                                                                                                          | Idea           | Problem                    |
| --------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------- |
| A. Log everything, alert everything                                                                             | Feels complete | Noise. People ignore pages |
| B. Golden signals + AI / voice / business metrics (section 45). Alerts only for section 46 with real thresholds | Useful         | Production ops             |

**We choose: B.**

#### Options — notifications

| Option                       | Idea                                                   | Problem                   |
| ---------------------------- | ------------------------------------------------------ | ------------------------- |
| A. SMTP inside every service | Fast                                                   | Duplicated, hard to retry |
| B. Notification Service      | Consumes events / alert hooks. Email / Slack / webhook | One place                 |

**We choose: B.**

#### Learn tasks

- [ ] Write `docs/adr/0028-observability-alerts.md`
- [ ] Draft thresholds: error rate, P99, DB connections, queue depth, Kafka lag, Redis memory, pod restarts, LLM failure, voice latency
- [ ] Day 56 LLD: dashboards, alert rules, `services/notification`

#### Day notes

- Date:
- Result:
- Need for Day 56:

---

### Day 56 — BUILD: telemetry + notifications

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Confirm one request can show: gateway → agent → runtime → knowledge → LLM → tool
- [ ] Export system, AI, voice, and business metrics
- [ ] Alert rules (local Prometheus / Alertmanager or equal)
- [ ] `services/notification`
- [ ] Tests: failed LLM increments the right metric; notification consumer is idempotent

#### Done when

We can operate the system we already built.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 29 — AWS, Kubernetes, Terraform, CI/CD

|        |                |
| ------ | -------------- |
| Days   | 57–58          |
| Wave   | F              |
| Status | `not_started`  |
| Read   | sections 48–54 |

**What we already have:** a platform that runs locally. Cloud must **deploy this**. Cloud must not invent a new app.

**What we add now:** Terraform modules, EKS deploy, environments, pipeline, rolling + blue/green notes, rollback.

---

### Day 57 — LEARN: cloud is a destination, not a rewrite

**Status:** `not_started` · **Hours:** 6

#### Options

| Option                                                                | Idea         | Problem                                        |
| --------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| A. Click in AWS console                                               | Fast         | Cannot reproduce. Breaks section 50            |
| B. ECS / Fargate only                                                 | Valid AWS    | Weaker Kubernetes learning vs the project goal |
| C. Terraform + EKS + ECR + managed data services, mapped from Compose | Reproducible | Matches the project                            |

**We choose: C.**

Environments: `local` (already exists), `dev`, `staging`, `production` (smaller size for non-prod).

CI:

```text
push → lint → unit → integration → security scan → image → ECR → deploy dev → smoke → staging → smoke
```

Production can stay gated. Build the pipeline through staging.

Deploy: Kubernetes rolling with probes as default. Blue/green for gateway/runtime if ALB allows. Write rollback steps.

#### Learn tasks

- [ ] Write `docs/adr/0029-aws-eks-cicd.md`
- [ ] Map Compose → AWS: Aurora/RDS, ElastiCache, MSK, SQS, S3, OpenSearch, Secrets Manager
- [ ] Day 58 LLD: `infra/modules`, `infra/environments/dev`, GitHub Actions, Helm/manifests

#### Day notes

- Date:
- Result:
- Need for Day 58:

---

### Day 58 — BUILD: infra as code and pipeline

**Status:** `not_started` · **Hours:** 6

#### Build tasks

- [ ] Terraform: networking, IAM, EKS, data stores (dev size)
- [ ] Docker images + ECR push
- [ ] K8s: deployments, services, probes, resources, HPA on gateway/runtime
- [ ] CI through staging smoke
- [ ] Rollback instructions
- [ ] If real AWS is not in this environment: Terraform must still `validate` / `plan`. Pipeline can run on local/kind. Do not fake a green production deploy

#### Done when

Infrastructure is code. A bad deploy has a written reverse path.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 30 — Load, failure, DR, SDKs, closeout

|        |                    |
| ------ | ------------------ |
| Days   | 59–60              |
| Wave   | F                  |
| Status | `not_started`      |
| Read   | sections 24, 55–63 |

**What we already have:** the system, and a way to deploy it.

**What we add now:** proof, developer platform polish, runbooks, final check vs section 63.

**Not now:** a new domain. If something is missing, go back to that earlier slot. There is no Slot 31.

---

### Day 59 — LEARN: how we prove it, and how developers use it

**Status:** `not_started` · **Hours:** 6

#### Options — load test

| Option                                                | Idea                                                                  | Problem                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A. Click the widget ten times                         | Fast                                                                  | Not scale                                                               |
| B. Scripted load on gateway + runtime + conversations | Measure throughput, P50/P95/P99, errors, DB, Redis, queues, Kafka lag | We may not hit 1,000 RPS on a laptop. We will find the first bottleneck |

**We choose: B.**

#### Options — failure test

| Option                            | Idea                                                                        | Problem                                                                          |
| --------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A. Only unit mocks                | Fast                                                                        | Not real failure                                                                 |
| B. Break one dependency at a time | Postgres, Redis, Kafka consumer, SQS worker, model provider, STT/TTS, a pod | Check detect → log/alert → retry/fallback → recover → no cross-tenant corruption |

**We choose: B.** This is planned chaos. Not Netflix-scale chaos automation.

#### Options — DR

| Option                                                                                                         | Idea       | Problem             |
| -------------------------------------------------------------------------------------------------------------- | ---------- | ------------------- |
| A. "We have Terraform so we are fine"                                                                          | Optimistic | No restore practice |
| B. Write RTO/RPO, backup/restore Postgres and S3, Kafka replay, recreate from Terraform, one restore rehearsal | Honest     | Production thinking |

**We choose: B.**

#### Options — SDK

| Option                                                                                                           | Idea                    | Problem                                                |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| A. OpenAPI file is the SDK                                                                                       | Lazy                    | Developers still copy HTTP                             |
| B. TypeScript SDK for `agent.run/stream`, `conversation.create/send`, `knowledge.search`. Python if time remains | Real developer platform | TypeScript is required. Python must not delay runbooks |

**We choose: B.**

#### Learn tasks

- [ ] Write `docs/adr/0030-proof-and-developer-platform.md`
- [ ] Pick load tool (k6 or vegeta or autocannon). Scenario = authenticated chat stream, not health-check flood
- [ ] Write tomorrow failure matrix (section 40 items we actually have)
- [ ] List runbooks for Day 60 (section 62)
- [ ] Day 60 LLD: test script paths, SDK layout, closeout checklist

#### Day notes

- Date:
- Result:
- Need for Day 60:

---

### Day 60 — BUILD: prove, SDK, close the board

**Status:** `not_started` · **Hours:** 6

Do this order. Do not polish the SDK if proof work is not done.

| Hours     | Work                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| 0:00–2:00 | Load test chat/runtime. Save results in `tests/load/`. Write the bottleneck                                   |
| 2:00–3:30 | Failure tests: Redis down, model timeout, SQS worker crash, duplicate Kafka message. Save in `tests/failure/` |
| 3:30–4:15 | DR notes + one backup/restore or Terraform recreate dry-run. Fill RTO/RPO                                     |
| 4:15–5:15 | TypeScript SDK + example README                                                                               |
| 5:15–6:00 | Runbooks, section 63 checklist, progress board, commit                                                        |

#### Build tasks

- [ ] Load test with P50 / P95 / P99, error rate, one named bottleneck
- [ ] Failure tests for cache, LLM, queue worker, duplicate event
- [ ] Runbooks: database failure, Redis outage, Kafka lag, SQS backlog, LLM outage, voice provider outage, deploy rollback, high CPU, high P99
- [ ] RTO/RPO in `docs/architecture/disaster-recovery.md`
- [ ] TypeScript SDK in `sdk/typescript` with a working local example
- [ ] Python SDK only if TypeScript and runbooks are done
- [ ] Walk [Coverage map](#7-coverage-map). Mark `done` or `gap` with the slot that owns the gap
- [ ] Set progress to 60/60 only if "Done when" across slots is honest

#### Done when

We can show a platform: multi-tenant agents on chat and voice, knowledge, tools, inbox, events, workflows, campaigns, leads, eval, usage, audit, observability, infra-as-code, and failure behavior. Gaps are written. Gaps are not hidden.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:
- Gaps after day 60 (if any):

---

## 7. Coverage map

Use this so a later part of `project_details.md` does not feel like a new project. When a slot is done, mark the rows.

| Details section | Topic                                       | Slot                | Status        |
| --------------- | ------------------------------------------- | ------------------- | ------------- |
| 1–3, 64–66      | Purpose, philosophy, anti-goals             | 01                  | `not_started` |
| 4–5             | Scale targets (design, not 1k RPS on day 1) | 01, 06, 30          | `not_started` |
| 6               | Conversations                               | 09, 17, 18          | `not_started` |
| 7, 25–26        | Voice                                       | 21, 22              | `not_started` |
| 8, 29           | Events                                      | 19                  | `not_started` |
| 9, 35           | Data architecture                           | 02                  | `not_started` |
| 10, 14          | Agent + builder                             | 07                  | `not_started` |
| 11              | Agent versions                              | 08                  | `not_started` |
| 12              | Multi-tenant hierarchy                      | 04, 05              | `not_started` |
| 13              | IAM, RBAC, API keys                         | 04, 05, 15          | `not_started` |
| 15              | Knowledge / RAG                             | 12, 13              | `not_started` |
| 16              | Runtime                                     | 11                  | `not_started` |
| 17              | Model gateway                               | 10                  | `not_started` |
| 18              | Tools, MCP                                  | 15                  | `not_started` |
| 19              | Secrets                                     | 16                  | `not_started` |
| 20              | Knowledge vs short-term vs memory           | 09, 14              | `not_started` |
| 21–22           | Inbox, handoff                              | 09, 18              | `not_started` |
| 23              | Website chat                                | 17                  | `not_started` |
| 24              | SDKs                                        | 06, 30              | `not_started` |
| 27              | Campaigns                                   | 23                  | `not_started` |
| 28              | Leads                                       | 24                  | `not_started` |
| 30              | Workflows                                   | 20                  | `not_started` |
| 31              | Evaluation                                  | 25                  | `not_started` |
| 32–33           | Usage, billing                              | 26                  | `not_started` |
| 34              | Audit                                       | 27                  | `not_started` |
| 36–37           | Services and communication                  | 01, 06, 19          | `not_started` |
| 38–40           | Reliability, HA, failure                    | 03, 22, 29, 30      | `not_started` |
| 41              | Consistency                                 | 08, 19, 26          | `not_started` |
| 42              | Caching                                     | 03, 07, 16          | `not_started` |
| 43              | Read replicas                               | 08, 29              | `not_started` |
| 44–46           | Observability                               | 03, 28              | `not_started` |
| 47              | Security                                    | 04, 05, 16, 27      | `not_started` |
| 48–52           | AWS, K8s, Terraform, environments           | 02, 29              | `not_started` |
| 53–54           | CI/CD, deploy                               | 29                  | `not_started` |
| 55–56           | Testing, load                               | every build day, 30 | `not_started` |
| 57–58           | DR, chaos                                   | 30                  | `not_started` |
| 59              | Developer experience                        | 01, 30              | `not_started` |
| 60–62           | Repo, ADRs, runbooks                        | 01, 30              | `not_started` |
| 63              | Final demonstration list                    | 30                  | `not_started` |

---

## 8. Final checklist

Mark these on Day 60. If one is false, write the gap and the slot to fix. Do not invent a new architecture only to tick a box.

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
- [ ] Blue/green or rolling + written rollback
- [ ] Load testing evidence
- [ ] Failure testing evidence
- [ ] Disaster recovery write-up

---

## 9. Daily log

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

## 10. If we fall behind

Do not skip a wave to "catch up" on voice or AWS. That creates a rewrite. This plan exists to avoid that.

1. Finish the current slot "Done when", even if it uses the next calendar day.
2. In the daily log, call that extra day `slipped recovery`. Do not call it the next slot.
3. Cut only nice-to-have items later (Python SDK, extra providers, extra dashboards).
4. Never cut: tenancy tests, timeouts, outbox/idempotency, secret masking, failure matrix.

If more than two slots are `slipped` at the same time, stop new features. Use the next learn day only to close gaps.

The 60-day finish is a complete platform. It is not a half-working voice demo on a broken tenant model.
