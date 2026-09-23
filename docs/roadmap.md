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

A **slot** = 2 days. We do not add extra calendar days for the talk.

- **Day 1** is technical learning first, then a small build (one spike or one narrow slice). Each person prepares half of the talk.
- **Day 2** is the deep build. The deep focus is the failure, scale, and operations problem of that slot. At the end of day 2, Aqib and Hashir deliver the talk to each other.

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

| Item               | Rule                                                          |
| ------------------ | ------------------------------------------------------------- |
| Calendar           | 60 days, every day                                            |
| Hours each day     | 6 hours                                                       |
| Total              | 360 hours                                                     |
| Day 1 of each slot | Learn, then a small build, then prepare your half of the talk |
| Day 2 of each slot | Deep build, then deliver the talk                             |

### Design scale (use these numbers in every slot)

These numbers come from `project_details.md` sections 4–7. They are the **design target**. They are not the traffic we expect on a laptop.

- 10,000+ organizations, 50,000+ users, 100,000+ configured agents.
- 1,000+ requests/second sustained API traffic, and 5,000+ requests/second burst.
- Millions of conversations and millions of messages per day, with thousands of concurrent active conversations.
- Hundreds of concurrent voice calls, with a path to add more instances later.

When a slot says "at scale", it means these numbers. A design that only works for one user on one process is not done.

### People

Two people work on this project. Tasks in each slot are split so they do not edit the same files on the same day.

- **Aqib** owns correctness, authentication, the data model, failure behavior, and shared packages (`packages/*`, migrations, and gateway policy). Aqib may take a second task only when that second task does not edit the same files.
- **Hashir** owns a bounded slice that compiles against a stable contract. That slice is usually tests, HTTP examples, docs, the widget, or fixtures. Hashir does not edit the service Aqib is editing that day. Hashir does not edit a shared package on the same day Aqib is changing it.

These rules are mandatory:

- One person owns one service directory for that day.
- One person owns one shared package for that day. The other person only calls that package.
- If both people need a change in a shared package, Aqib lands that change on day 1. Hashir uses the new API on day 2.
- Do not start the next service until the previous slot's contract is on the `aqib` branch.

### Day 1 — learn, small build, prepare the talk (6 hours)

| Time      | What to do                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Read the listed `project_details.md` parts. Write what we already have.                                             |
| 0:30–3:00 | Study the topics, the scale, the scenarios, and the junior versus senior difference. Write notes in full sentences. |
| 3:00–4:00 | Write the ADR. State the decision we already made, and what fails if we pick the rejected option at this scale.     |
| 4:00–5:15 | Do the small day-1 build. One spike or one narrow slice. Do not build the whole service.                            |
| 5:15–6:00 | Prepare your half of the talk. Write the LLD for day 2: files, APIs, tables, tests, and "Done when".                |

Day 1 is done only when we have:

- notes that cover topics, scale, scenarios, and junior versus senior
- one ADR
- one LLD for day 2
- one small spike if the idea is new
- each person's talk half written down

### Day 2 — deep build and deliver the talk (6 hours)

| Time      | What to do                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| 0:00–0:20 | Read yesterday's ADR and LLD. Do not redesign unless the LLD is wrong.                                       |
| 0:20–4:15 | Build the owned file tree. Aqib and Hashir do not edit the same directory.                                   |
| 4:15–5:00 | Tests: happy path, tenant isolation, and one timeout, retry, or failure case.                                |
| 5:00–6:00 | Deliver the talk (about 45–60 minutes). Then tick boxes and commit. Mark `done` only if "Done when" is true. |

The talk is about the thing we just built. It is not a definition of a protocol name. The agenda is:

1. What we built, and which files own it.
2. One failure we handled, and what the system does.
3. One thing that is still unsafe at 1,000 requests/second.
4. What we would measure (latency, error rate, saturation, or a business counter).

Kubernetes and cloud accounts are built in slots 28–30. Earlier talks still explain the cluster idea that those slots will run later: the process is stateless, health checks exist, and two replicas change rate limits and in-memory state.

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

Update these three lines every day. Day 1 of a slot is learning plus a small build. Day 2 is the deep build plus the talk. Slot status values below stay as they are.

- **Current day:** Day 7
- **Current slot:** Slot 05 — Workspace and tenancy
- **Overall progress:** 6 / 60 days (10%)

| Slot | Days  | Theme                                | Learn | Build | Status        |
| ---- | ----- | ------------------------------------ | ----- | ----- | ------------- |
| 01   | 1–2   | Engineering foundation               | [ ]   | [x]   | `done`        |
| 02   | 3–4   | Local data plane                     | [x]   | [x]   | `done`        |
| 03   | 5–6   | Shared platform libraries            | [x]   | [x]   | `done`        |
| 04   | 7–8   | Identity                             | [x]   | [x]   | `done`        |
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

Each slot from Slot 05 onward has this shape. Slots 01–03 keep their original build history and add a short retrospective. Slot 04 keeps its original build history and adds a full study block.

1. **What we already have**
2. **What we add now**
3. **Not now**
4. **Why this slot is now**
5. Day 1: topics, scale, scenarios, junior versus senior, the decision we already made, a small build, and the talk split
6. Day 2: Aqib's files, Hashir's files, deep focus, talk delivery, and "Done when"

Write in complete sentences. Name the mechanism, say what breaks at the design scale, and say what we will implement. Do not leave the learning as a table of one-word ideas.

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

#### Retrospective study (status stays `done`)

Read these topics even though the slot is already built. Each person prepares two points and explains them in one short pass. This is not a second build day.

1. A monorepo keeps service boundaries and shared contracts in one pull request. A polyrepo forces contract drift across 16 repositories for a two-person team.
2. A monolith is faster in week one and becomes a rewrite when voice, events, and a separate runtime need different deploy and failure rules.
3. TypeScript on Node is the default language so both people can read every service. A second language is allowed later only for a voice sidecar.
4. Public APIs are HTTP and JSON. gRPC is not the first internal protocol, because the gateway, the widget, and the SDK all speak HTTP first.
5. At the design scale, the repo layout does not create requests per second. A bad layout does force a rewrite, and a rewrite at 10,000 organizations is the expensive failure.

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

#### Retrospective study (status stays `done`)

1. Postgres is the system of record for users, orgs, agents, conversations, and billing. Mongo-first makes membership and money harder to constrain.
2. Redis or Valkey holds cache, sessions, rate-limit counters, locks, and idempotency keys. It is not the conversation database. If Redis is empty, the product data must still exist in Postgres.
3. Kafka carries business events that more than one consumer may replay. SQS carries jobs that need retries and a dead-letter queue. Using Kafka for every small job makes a simple retry heavy.
4. OpenSearch holds keyword and vector search so search traffic does not sit on the transactional primary. pgvector in the primary is acceptable for a demo and dangerous when retrieval and writes share one database at 1,000 requests/second.
5. Docker Compose is the daily environment. Kubernetes is Slot 29. Starting local Kubernetes on day 3 spends the slot on YAML instead of on store semantics.

---

## Slot 03 — Shared platform libraries

|        |                            |
| ------ | -------------------------- |
| Days   | 5–6                        |
| Wave   | A                          |
| Status | `done`                     |
| Read   | sections 38, 41–42, 44, 59 |

**What we already have:** `@quickstart/errors`, `logging`, `tracing`, `auth`, `utilities`; template uses envelope + traces.

**What we add now:** shared errors, logging, tracing, auth context, HTTP client (timeout / retry / circuit breaker), idempotency helpers.

**Not now:** real login (Slot 04). Product dashboards (Slot 28).

**Why this slot is now:** if Identity and Runtime use different error JSON, the gateway cannot show one API. Reliability must exist before the first LLM call.

---

### Day 5 — LEARN: shared standards

**Status:** `done` · **Hours:** 6

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

- [x] Write `docs/adr/0003-platform-libraries.md`
- [x] Error envelope: `code`, `message`, `request_id`, `details`
- [x] Span fields: `trace_id`, `span_id`, `request_id`, `tenant_id`, `agent_id`, `conversation_id`
- [x] Spike: one OTel trace from template service to collector
- [x] Day 6 LLD for `packages/errors`, `logging`, `tracing`, `auth`, `utilities`

#### Day notes

- Date:
- Result:
- Need for Day 6:

---

### Day 6 — BUILD: shared packages

**Status:** `done` · **Hours:** 6

#### Build tasks

- [x] `packages/errors` + unit tests
- [x] `packages/logging` JSON logs + redaction helper
- [x] `packages/tracing` OTel bootstrap
- [x] `packages/auth` context type + extractor (no password login yet)
- [x] `packages/utilities`: timeout, retry + backoff, circuit breaker, idempotency key, Redis lock
- [x] Template service sends one traced request and uses the error envelope
- [x] Test: retry does **not** retry an unsafe POST

#### Done when

Another service can import these packages. Template service shows a trace in the local collector. Still no product domain.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

#### Retrospective study (status stays `done`)

1. One error envelope (`code`, `message`, `request_id`, `details`) is a platform contract. If Identity and Runtime invent different JSON, the gateway and the SDK cannot handle errors in one way.
2. OpenTelemetry with W3C trace context is how a request is followed across the gateway and services. `console.log` of an id does not survive a second process.
3. Outbound HTTP must have a timeout. Retry is allowed for safe methods. A POST is not retried unless an idempotency key exists, because a retried tool call or a retried charge happens twice.
4. Services do not trust `userId` from the body or the query string. After Slot 06, the gateway validates the caller and passes an internal auth context. Until then, Identity validates its own tokens because clients can still call it directly in local development.
5. `@quickstart/http-server` is the shared Express composition (request id, tracing hook, timeout, JSON limit, optional rate limit, error middleware). It is not the public gateway. Two replicas make an in-memory rate limit weaker, because each process counts separately.

---

## Slot 04 — Identity

|        |                    |
| ------ | ------------------ |
| Days   | 7–8                |
| Wave   | A                  |
| Status | `done`             |
| Read   | sections 12–13, 47 |

**What we already have:** `services/identity-service`, ADR 0004, JWT helpers in `@quickstart/auth`, org API keys.

**What we add now:** users, login, tokens, API keys, first organization.

**Not now:** workspace RBAC matrix (Slot 05). Agent-scoped keys come with Agent service.

---

### Day 7 — LEARN: identity models

**Status:** `done` · **Hours:** 6

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

- [x] Write `docs/adr/0004-identity.md`
- [x] Short threat list: credential stuffing, token theft, key leak
- [x] Spike: register/login against local Postgres
- [x] Day 8 LLD: tables `users`, `organizations`, `org_memberships`, `api_keys`, `refresh_tokens`

#### Day notes

- Date:
- Result:
- Need for Day 8:

---

### Day 8 — BUILD: Identity Service

**Status:** `done` · **Hours:** 6

#### Build tasks

- [x] `services/identity-service` from the template
- [x] Register, login, logout/refresh, me
- [x] Create organization + first owner
- [x] API key issue / revoke
- [x] Password hashing, token revocation
- [x] Tests: wrong password, refresh reuse, IDOR on membership
- [x] Healthz + migrations

#### Done when

We can create a user and org by API. Tokens work. Keys are hashed. Identity is its own service.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

#### Retrospective study (status stays `done`)

The build is finished. This block is the staff-level study we still owe. Do not reopen the build checkboxes. Use one meeting to deliver the talk from the code that already exists in `services/identity-service`.

##### 1. Topics to learn before you treat identity as "done"

1. An access token is a short-lived JWT. The resource server checks the signature, the expiry, the issuer, and the audience. A long-lived access token is a stolen session that we cannot kill quickly.
2. A refresh token is an opaque secret. We store only a hash. The raw token is shown once, in the login or refresh response. Rotation means the old hash is marked replaced and a new hash is inserted in the same transaction.
3. Refresh reuse means a token that was already replaced is presented again. That is treated as theft. The safe action is to revoke the whole session family, not to issue another access token.
4. Revocation is not a JWT blacklist of every access token at 1,000 requests/second unless we accept a Redis read on every request. We revoke the session id in Redis (Valkey). Access tokens stay short so a revoked session stops being useful quickly. A database row `revoked_at` is the durable record for refresh tokens.
5. Password storage uses a slow password hash (argon2 or bcrypt). We do not invent a hash. We do not log the password, the hash, the raw refresh token, or the raw API key.
6. API keys are hashed at rest. The raw key is returned once. A prefix may be stored so support can identify a key without storing the secret.
7. OWASP problems that this service must be able to name: credential stuffing on login, session fixation and token theft, insecure direct object reference on organization membership, and secret leakage in logs and error `details`.
8. Clock skew: a token that is "not yet valid" or "just expired" needs a small leeway. A large leeway makes expiry meaningless.
9. Signing-key rotation: a new key must verify new tokens while the previous key still verifies tokens that have not expired. `alg: none` and a key taken from the token header are rejected.
10. Login and register need a tighter limit than the rest of the API, because those routes are the credential-stuffing surface.

##### 2. Scale

Login is not the hot path at 1,000 requests/second. Token checks and session-revocation lookups are the hot path, because almost every authenticated call does them. The Identity process must stay stateless: no in-memory user cache that becomes wrong when a second replica revokes a session. Postgres holds users, organizations, memberships, hashed refresh tokens, and hashed API keys. Redis holds the revocation set so a logout is visible to every replica. A table scan on `users` by email is not acceptable once we have 50,000 users; the unique index on email is the lookup.

##### 3. Scenarios

- Two devices refresh at the same time. The row lock (`FOR UPDATE`) lets one rotation commit. The other sees the token already replaced and must not both succeed.
- A stolen refresh token is used after the real client already rotated. We revoke the session and force a new login.
- Redis is down at process start. The server does not start, because a silent in-memory revocation list would disagree across replicas and would forget logouts on restart.
- A pod dies after inserting the user and before inserting the organization. The register transaction rolls back. We do not leave a user with no org.
- Tenant A passes Tenant B's organization id. Membership is checked. A missing membership is not found, not a data leak.
- The gateway is not in the path (local `curl` to the identity port). Identity still enforces its own token check. In production, with a VPC that only allows the gateway, the public JWT check moves to the gateway and Identity trusts the internal auth context. That production simplification is Slot 06. It does not remove password verification on login.

##### 4. Junior approach vs senior approach

A junior approach stores a JWT in `localStorage` for 30 days, puts the user id in the query string, and logs the token when login fails. That works on one laptop and fails the first stolen laptop and the first second replica.

A senior approach uses a short access JWT, a hashed rotating refresh token, reuse detection, Redis session revocation, hashed API keys, rate limits on login, and tests for the wrong password, refresh reuse, and IDOR.

A staff approach does not build multi-region session replication, a customer-managed key, or SSO in this slot. Those waits are safe because the token and session model can add an issuer later without replacing the user table. We also do not put a global in-memory blacklist of every access JWT in the shared HTTP package, because that blacklist is wrong as soon as two pods run.

##### 5. Decision we already made

We own the Identity service and we use standard primitives. We do not start on Auth0, Clerk, or Cognito as the only identity, because tool permissions, audit, and org membership would sit outside a system we can explain. We do not write our own crypto. The session model is a short-lived access JWT plus a hashed refresh token, with session metadata in Redis so we can revoke. API keys are hashed. The raw key is shown once.

##### 6. Small day-1 build

Already done: register and login against local Postgres. Do not rebuild it. If you restudy, read `rotateRefreshToken` and explain the lock in your own words.

##### 7. Talk split

Aqib explains access tokens, refresh rotation, the row lock, reuse detection, and Redis revocation. Hashir explains password hashing, API key hashing, the IDOR test, what must never appear in logs, and which login routes are rate limited. Both people point at the file they mean. The talk is not a history of OAuth.

##### Talk delivery (do this once, even though the slot is `done`)

45–60 minutes. Agenda: what the identity service actually stores, one failure the refresh lock handles, what is still unsafe at 1,000 requests/second (in-memory rate limit, no key-rotation runbook yet), and what we would measure (login failures, refresh reuse events, Redis errors, p99 of token validation).

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

**Why this slot is now:** every later query is tenant-scoped. If we add agents before the tenant argument is required, we will retrofit isolation under load.

---

### Day 9 — LEARN and small build: multi-tenant isolation

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** every query carries a tenant, and a missing tenant is a bug, not a filter you can forget.

#### 1. Topics to learn before code

1. An organization is the billing and membership boundary. A workspace is the place where agents, knowledge, and conversations live. They are not the same table, and a user can belong to more than one workspace under one organization.
2. Shared-schema multi-tenancy means one Postgres database and a `tenant_id` (workspace id) on every tenant-owned row. Isolation is a predicate in every repository method, not a comment in the controller.
3. `TenantContext` is the object the repository requires. It contains the workspace (or organization) the caller is allowed to touch. A method that accepts an optional tenant is a future IDOR.
4. Permission strings such as `workspace.agent.publish` are checked in one function, `requirePermission`. Scattering `if role === admin` makes a new role a search-and-replace across every service.
5. Roles for this slot are Owner, Admin, Developer, Operator, Analyst, and Human Agent. Analyst must be denied publish even though the publish feature arrives in a later slot. The deny is the test that the permission exists.
6. Invites and role changes are writes. They need the same permission check as creating an agent. A role change that does not write an audit-shaped record will be hard to explain in Slot 27, so the table should already store who changed the role.
7. IDOR means the caller passes another tenant's id and the server returns the row because it filtered only by primary key. The fix is to filter by primary key and tenant together.
8. With two replicas, an in-memory "current tenant" on the process is wrong. The tenant comes from the request (later from the gateway auth context), not from a global variable.

#### 2. Scale

At 10,000 organizations, a missing `tenant_id` index turns every list API into a sequential scan. At 1,000 requests/second, the hot path is "load membership, then load the workspace row," not the invite email. The workspace service must be stateless. Permission checks may cache a membership in Redis with a short TTL, but the source of truth stays in Postgres so a role change is not stuck in one pod's memory.

#### 3. Scenarios

- Workspace A's member calls a route with Workspace B's id. The repository returns nothing. The test fails if any field of B is present.
- An Analyst calls publish. The permission check returns forbidden before any write.
- Two admins change the same member's role at once. The second write uses a version or an update that checks the previous role, so we do not silently lose one change.
- The pod dies after inserting a workspace and before inserting the owner membership. The transaction rolls back. We do not leave an empty workspace that nobody can administer.
- A request has no tenant context. The handler rejects it. It does not default to the first workspace in the database.

#### 4. Junior approach vs senior approach

A junior approach adds `WHERE workspace_id = $1` only on the routes they remember, and checks `role === admin` inside each controller. That passes a demo and fails the first copied request.

A senior approach puts `TenantContext` on the repository interface, checks `requirePermission` on every write, and ships an IDOR test that is not optional.

A staff approach does not build a database per tenant or a schema per tenant in this slot. Those models isolate noisy neighbors more strongly and make migrations and 10,000-org operations too heavy for this program. We also do not build tool-level RBAC here. Slot 15 reuses the same permission strings.

#### 5. Decision we already made

We use one shared schema, and every tenant-owned repository method takes `TenantContext`. We rejected a database per tenant because 10,000 databases is an operations problem we do not need yet. We rejected a schema per tenant because every migration would run thousands of times. We use permission strings, not scattered role comparisons, so later tools can call the same checker.

#### 6. Small day-1 build

Aqib writes `docs/adr/0005-tenancy-and-rbac.md` and one SQL spike that creates `workspaces` and `workspace_memberships` with a tenant key. Hashir writes a one-page note that defines Organization versus Workspace in full sentences, and lists the IDOR cases the day-2 tests will cover. Hashir does not edit `packages/auth` on this day.

#### 7. Talk split

Aqib prepares: shared schema, `TenantContext`, what a repository method signature must look like, and why two replicas cannot keep the tenant in process memory. Hashir prepares: the six roles, what Analyst cannot do, and two IDOR stories (read and role change) in plain words tied to the test names we will add.

#### Day notes

- Date:
- Result:
- Need for Day 10:

---

### Day 10 — BUILD and talk: workspace service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** tenant predicate on every query, and IDOR tests that fail closed.

#### Aqib (owns `services/workspace` and `packages/auth` this day)

- [ ] Create `services/workspace` from the service template, with its own migrations.
- [ ] Workspaces under an organization, plus members, invites, and role changes.
- [ ] `requirePermission` on every write route.
- [ ] `TenantContext` in `packages/auth`. Repository methods require it.

#### Hashir (does not edit `services/workspace` or `packages/auth`)

- [ ] After Aqib's repository methods exist, add tests that Workspace A cannot read Workspace B, and that Analyst cannot publish.
- [ ] Add the Organization versus Workspace note under `docs/architecture/` if it is not already there.
- [ ] HTTP examples for invite and role change, using the error envelope. Do not change the handler code.

#### Talk delivery

Explain the tenant predicate, one IDOR the test catches, what is still unsafe at 1,000 requests/second (permission lookup on every write with no cache yet), and what we would measure (forbidden rate, membership lookup latency).

#### Done when

Tenancy is a platform rule. A later service cannot query tenant data without a tenant argument. Wave A is complete.

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

**Not now:** AWS API Gateway or an ALB (Slot 29). GraphQL. Widget public routes can be a group on this same gateway later.

**Why this slot is now:** browsers must not call every microservice. That multiplies CORS, auth, and tenant leaks.

---

### Day 11 — LEARN and small build: how clients enter

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the gateway is the public door. Internal services trust a context the gateway already checked.

#### 1. Topics to learn before code

1. The gateway is a synchronous HTTP entry. It may enqueue work later, but the first hop from the client is HTTP.
2. The gateway validates the access JWT or the API key, resolves the tenant, applies a rate limit, and forwards the call. It does not contain agent or workspace business rules.
3. Internal services receive an auth context header. They do not re-parse the public JWT on every route once this slot is the only public door. Identity still verifies passwords on login, because the gateway forwards the login body.
4. Rate limits at the edge use Redis (a sliding window or a token bucket) keyed by IP, user, or API key. An in-memory counter in the gateway process is wrong as soon as two gateway replicas run, because each replica allows the full budget.
5. Middleware order is `request_id`, then timeout, then auth, then tenant, then rate limit, then route. A rate limit before auth keys only on IP and cannot key on the user. Auth before a body-size limit can still be abused by a huge body, so the body limit stays early.
6. 401, 403, and 429 use the shared error envelope. A gateway that returns plain text breaks the SDK.
7. In a VPC where only the gateway can reach the services, the service-level global IP limit is a backup, not the main fairness control. Service timeouts and body limits stay, because the gateway does not execute the handler.
8. `trust proxy` must match the real number of proxies. A wrong setting makes the rate-limit IP spoofable or useless.

#### 2. Scale

1,000 requests/second sustained, and 5,000 burst, land on the gateway first. The gateway must not hold session state in memory. Redis holds the counters. A slow membership lookup inside the gateway on every call will dominate p99, so the gateway should validate the token and forward, and let the workspace service enforce the fine permission.

#### 3. Scenarios

- The caller has no token. The gateway returns 401 and does not call the internal service.
- The token is expired or signed with the wrong key. The gateway returns 401.
- One API key exceeds the limit. That key receives 429. A different tenant on another key still succeeds.
- The internal service is down. The gateway returns a platform timeout or bad-gateway error with `request_id`. It does not hang until the load balancer kills it.
- Someone discovers the internal URL. In production the security group blocks it. The talk must say what still happens if that rule is wrong.

#### 4. Junior approach vs senior approach

A junior approach lets the browser call Identity, Workspace, and Agent on three ports, and rate-limits with a `Map` inside one Node process.

A senior approach forces external clients through one gateway, stores limits in Redis, and forwards a tenant context the service can trust only because the network path is the gateway.

A staff approach does not adopt a service mesh as the public door in this slot. A mesh is useful later inside the cluster. It is not how a customer authenticates. We also do not put JWT validation inside `@quickstart/http-server`, because that package is the internal service shell, not the edge.

#### 5. Decision we already made

We build an API gateway (BFF style) as the public entry. We rejected direct browser-to-service calls because CORS, auth, and tenant leaks explode. We rejected "mesh only" because a mesh is not a public door. Rate limits use Redis, not an in-process counter.

#### 6. Small day-1 build

Aqib spikes a gateway process that checks a JWT and calls Identity `/v1/me`, and writes `docs/adr/0006-api-gateway.md` with the route map `/v1/auth` and `/v1/workspaces`. Hashir writes the public URL list and three example error bodies (401, 403, 429) in `docs/api/`. Hashir does not edit the gateway process on day 1.

#### 7. Talk split

Aqib prepares the middleware order, Redis versus in-memory limits, and what two gateway replicas do to a counter. Hashir prepares the status codes, the `request_id` header, and which paths are public versus internal.

#### Day notes

- Date:
- Result:
- Need for Day 12:

---

### Day 12 — BUILD and talk: gateway

**Status:** `not_started` · **Hours:** 6

**Deep focus:** edge authentication versus service trust, and a limit that still works with two replicas.

#### Aqib (owns the gateway service)

- [ ] One public HTTP server. Bind `0.0.0.0` and the platform `PORT` when this runs in cloud later.
- [ ] Route to Identity and Workspace.
- [ ] Redis rate limits.
- [ ] 429, 401, and 403 use the shared error envelope.

#### Hashir (owns `docs/api/` and gateway tests that do not change gateway routing code while Aqib is in that file)

- [ ] Tests: missing token, bad token, rate limit, and `request_id` returned. Add them after the routes exist, in a test file Aqib is not editing.
- [ ] Start the OpenAPI file in `docs/api/` for the routes that exist today.

#### Talk delivery

What the gateway checks, what happens when Redis is down (fail closed on auth routes, and say so), what is still unsafe at 5,000 burst (no per-tenant fairness beyond a single key limit), and what we measure (429 rate, auth failure rate, upstream timeout rate).

#### Done when

External clients have one door. Internal service URLs are not the public API.

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

**What we add now:** the Agent object. That is the name, instructions, model settings, environment, and channel flags. This is configuration only.

**Not now:** publish and rollback (Slot 08). Runtime (Slot 11). Knowledge links (Slot 12).

**Why this slot is now:** later versions, runtime, and retrieval all point at an agent row. A JSON blob with no identity will not support unique names or concurrency.

---

### Day 13 — LEARN and small build: the Agent object

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the agent row is configuration. It is not the running loop, and two editors must not overwrite each other silently.

#### 1. Topics to learn before code

1. An agent has relational fields we query (workspace, name, environment) and a JSON column only for open model parameters that we do not want to migrate every week.
2. Environment now is draft versus a non-draft marker. Immutable versions are the next slot. If we edit the production row in place, we cannot roll back.
3. Unique name per workspace is a constraint, not a UI check. Two requests can pass a UI check and both insert.
4. Optimistic concurrency uses a version column. The update includes `WHERE version = $expected`. Zero rows updated means someone else saved, and the client must reload.
5. Channel flags (chat on, voice off) are config. They do not start a call.
6. The repository takes `TenantContext`. An agent id from another workspace returns not found.
7. Cache: a later runtime will cache the agent. This slot must define the invalidation key (agent id plus version) even if the cache is not built yet. A cache without a version serves a stale prompt after an edit.

#### 2. Scale

100,000 configured agents is a table with an index on `(workspace_id, name)`, not a list endpoint that loads every agent in the organization. The hot path later is "read one agent by id." This slot's write path is human editors, not 1,000 requests/second. The read path must still be indexed, because the runtime will read it on every conversation.

#### 3. Scenarios

- Two developers save the same draft. The second gets a conflict, not a silent overwrite.
- A caller in workspace A uses an agent id from workspace B. The response is not found.
- A duplicate name in the same workspace hits the unique constraint and returns a validation error, not a 500 with a driver string.
- Instructions contain a secret a user pasted. We do not log the full instructions at info level.

#### 4. Junior approach vs senior approach

A junior approach stores one JSON document and updates it with no version column.

A senior approach stores fields we query, uses optimistic concurrency, and scopes every query by workspace.

A staff approach does not build the workflow graph editor or the runtime in this slot. A graph editor is a product of its own. The runtime needs a published version, which does not exist yet.

#### 5. Decision we already made

The agent is a relational record. JSON is only for open model parameters. We keep an environment field now, and the next slot adds immutable versions. We do not edit one production row forever.

#### 6. Small day-1 build

Aqib writes `docs/adr/0007-agent-aggregate.md` and the agent table spike with the unique name and version column. Hashir lists fields that exist now versus fields that wait (knowledge ids, tools) in `docs/architecture/agent-fields.md`. Hashir does not edit the migration.

#### 7. Talk split

Aqib prepares optimistic concurrency and the unique constraint under two writers. Hashir prepares which fields are columns, which are JSON, and which fields are intentionally absent until later slots.

#### Day notes

- Date:
- Result:
- Need for Day 14:

---

### Day 14 — BUILD and talk: Agent service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** lost updates and tenant scope on a config object.

#### Aqib (owns `services/agent`)

- [ ] CRUD for agents in a workspace.
- [ ] Unique name per workspace.
- [ ] Optimistic concurrency on update.

#### Hashir (owns tests and examples, not the service source while Aqib is editing it)

- [ ] Tests: duplicate name, stale version, and cross-workspace read.
- [ ] One HTTP example of create and update with `If-Match` or the version field the API actually uses.

#### Talk delivery

Show a conflict response, show a cross-workspace miss, say what is still unsafe (no published snapshot yet, so runtime must not read this row as production), and name the metric (conflict rate, create latency).

#### Done when

A workspace can create and edit an agent. Two saves cannot silently clobber. Another workspace cannot read it.

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

**What we add now:** Draft, then Testing, then Staging, then Production. Published versions are immutable. Rollback moves a pointer.

**Not now:** the runtime reading the version (Slot 11). An eval gate on publish (Slot 25).

**Why this slot is now:** if the runtime starts before versions exist, it will bind to a mutable row and we will rewrite it.

---

### Day 15 — LEARN and small build: versioning

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** publish is a strongly consistent pointer move. The version row does not change after publish.

#### 1. Topics to learn before code

1. Overwriting the agent row destroys the previous prompt. There is no rollback and no audit of what production served.
2. An immutable `agent_versions` row is a copy of the draft at publish time. Rollback changes the production pointer. It does not edit the old version.
3. The draft stays editable after publish. Production reads the pointer, not the draft.
4. `base_version` on publish stops two people from publishing a stale draft. If the base does not match, publish fails.
5. Strong consistency on publish means the caller who receives success can immediately read the new production pointer. A replica that lags must not serve the old pointer after that success. If we add a read replica later, publish reads stay on the primary.
6. The state machine is Draft, Testing, Staging, and Production. Illegal jumps are rejected in the service, not only in the UI.
7. Diff is a read model over two version rows. It is not a second source of truth.

#### 2. Scale

Publish is rare compared with chat traffic. The dangerous scale is not 1,000 publishes per second. The dangerous scale is 1,000 runtime reads per second of the production pointer. That read must be a primary-key lookup. A publish transaction that locks the agent row for a long time will block those reads, so the transaction copies the snapshot and moves the pointer, and does not call an LLM.

#### 3. Scenarios

- Two publishers send the same `base_version`. One commits. The other gets a conflict.
- Rollback during a running conversation. The next turn loads the pointer. The current turn may finish on the old version. We document that. We do not kill an in-flight model call inside this slot.
- A published version row is updated by a bug. A database permission or a test forbids updates to version rows. Inserts are allowed. Updates are not.
- The pod dies after inserting the version and before moving the pointer. The transaction rolls back. Production still points at the previous version.

#### 4. Junior approach vs senior approach

A junior approach updates the live agent and keeps a JSON history array on the same row.

A senior approach inserts an immutable version and moves a pointer under a transaction and a base-version check.

A staff approach does not build a git repository per agent. Git is a poor query model for "what is production for this workspace." We also do not block publish on an eval score yet. That gate is Slot 25, and adding it now couples two unfinished systems.

#### 5. Decision we already made

We use immutable `agent_versions` plus a production pointer. Publish copies the draft. Rollback moves the pointer. The draft stays editable. Publish requires `base_version`.

#### 6. Small day-1 build

Aqib writes `docs/adr/0008-agent-versioning.md` and draws the state machine in that ADR. Hashir writes the publish, rollback, list, and diff request examples in `docs/api/` without implementing them.

#### 7. Talk split

Aqib prepares the transaction, the pointer, and read-your-writes. Hashir prepares the state machine and what rollback does to the next turn versus the current turn.

#### Day notes

- Date:
- Result:
- Need for Day 16:

---

### Day 16 — BUILD and talk: versions

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a publish transaction and a pointer that runtime will trust later.

#### Aqib (owns agent version code inside `services/agent`)

- [ ] Publish, rollback, list versions, and diff.
- [ ] Reject a stale `base_version`.
- [ ] Make version rows immutable in the application, and add a test that update-in-place fails.

#### Hashir (owns tests that Aqib is not editing)

- [ ] Tests for illegal state jumps and for rollback returning the previous snapshot.
- [ ] Keep the API examples matched to the real routes.

#### Talk delivery

Walk one publish and one rollback. Say what is still unsafe (runtime does not read the pointer yet, so production config can change without a running agent noticing). Measure publish conflicts and pointer-read latency later.

#### Done when

We can publish and roll back. The production pointer is what a later runtime must read. The draft is not production.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 09 — Conversation service

|        |                   |
| ------ | ----------------- |
| Days   | 17–18             |
| Wave   | B                 |
| Status | `not_started`     |
| Read   | sections 6, 20–22 |

**What we already have:** agents that can be published, but nothing to talk to yet.

**What we add now:** conversations, messages, participants, and session state.

**Not now:** the inbox UI (Slot 18). The website widget (Slot 17).

**Why this slot is now:** the runtime needs a durable log to append to. A vendor chat store would make handoff and search impossible to own.

---

### Day 17 — LEARN and small build: conversation as a durable log

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** messages are an append-only log with a sequence, scoped by tenant.

#### 1. Topics to learn before code

1. The conversation row is the durable header. Messages are separate rows. A single JSON array loses updates when two writers read-modify-write the same document.
2. `seq` is the order. Clients that reconnect ask for messages after the last `seq` they saw. A timestamp alone ties under concurrent inserts.
3. Postgres is the system of record. Redis may hold a short session cursor. If Redis is flushed, the log is still in Postgres.
4. Participants are rows (user, agent, later a human agent). Handoff in Slot 18 adds a participant. It does not copy the transcript into another product.
5. Append of a message and the bump of the conversation cursor belong in one transaction.
6. Idempotency: the widget will retry a send. A client idempotency key must not insert two user messages.
7. Tenant scope sits on the conversation. A message query joins through that tenant. A message id alone is not an authorization check.
8. Millions of messages per day means we do not `SELECT *` the whole history into the model on every turn. The runtime will trim context later. This slot still stores the full log.

#### 2. Scale

Thousands of concurrent conversations and millions of messages per day make the hot write the message insert. The index is `(conversation_id, seq)`. A global `ORDER BY created_at` across all tenants will not be the API. Retention is a later decision. This slot must not design a delete-everything job that locks the table.

#### 3. Scenarios

- Two sends for the same conversation race. Sequences are unique. One waits or one retries the next `seq`. We do not store two rows with the same `seq`.
- The client retries after a timeout. The idempotency key returns the original message.
- Redis is flushed. History still loads from Postgres.
- Workspace A requests a conversation id from workspace B. The result is not found.
- The pod dies mid-insert. The transaction rolls back. The client retry inserts once.

#### 4. Junior approach vs senior approach

A junior approach keeps the chat in the LLM vendor's thread id, or in Redis, because it is fast to demo.

A senior approach appends rows in Postgres, orders them by `seq`, and uses Redis only as a cursor.

A staff approach does not build the inbox, the widget, or full-text search in this slot. Search belongs with OpenSearch later. Building it on the primary now couples chat writes to search load.

#### 5. Decision we already made

Conversation history lives in our Conversation Service on Postgres. We do not use Redis as the log, and we do not leave history only at the model vendor. Messages are an append-only table ordered by `seq`.

#### 6. Small day-1 build

Aqib writes `docs/adr/0009-conversations.md` and the two-table spike (`conversations`, `messages`) with a unique `(conversation_id, seq)`. Hashir writes the reconnect story: client stores `conversation_id` and last `seq`. Hashir does not edit the migration.

#### 7. Talk split

Aqib prepares the transaction, the sequence, and idempotency. Hashir prepares why Redis is not the log, and how a reconnect avoids a new conversation.

#### Day notes

- Date:
- Result:
- Need for Day 18:

---

### Day 18 — BUILD and talk: Conversation service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** append-only writes, idempotency, and tenant scope. Two replicas must not create duplicate sequences.

#### Aqib (owns `services/conversation`)

- [ ] Create conversation, append message, list by `seq`, and list participants.
- [ ] Idempotency key on send.
- [ ] Tenant filter on every read and write.

#### Hashir (owns tests)

- [ ] Tests: retry does not double-insert, cross-tenant read fails, and `seq` is gap-free for a single conversation under a sequential test.
- [ ] Document the cursor fields the widget will need later. Do not build the widget.

#### Talk delivery

Show one retry and one cross-tenant miss. Say what is still unsafe at millions of messages per day (no partitioning, no archive job). Measure append latency and idempotency-key hits.

#### Done when

We can store a conversation that survives a Redis flush. Messages have a stable order. Another workspace cannot read them.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 10 — Model gateway

|        |                 |
| ------ | --------------- |
| Days   | 19–20           |
| Wave   | B               |
| Status | `not_started`   |
| Read   | sections 17, 38 |

**What we already have:** conversations to attach usage to later, and no model calls yet.

**What we add now:** a provider abstraction, timeout, retry, fallback, and token and cost hooks.

**Not now:** the agent loop (Slot 11). Invoices (Slot 26). This slot only exposes a usage port.

**Why this slot is now:** the runtime must not import a vendor SDK directly. The first vendor outage would become a rewrite.

---

### Day 19 — LEARN and small build: do not lock to one vendor

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** timeout, a single safe retry, and a fallback that cannot storm the provider.

#### 1. Topics to learn before code

1. The Model Gateway is our interface: `complete` and `stream`. Vendor SDKs stay behind that interface.
2. A timeout is mandatory. A hung provider socket must not pin a runtime worker until the pod is killed.
3. Retry once when the call is safe to retry. Streaming that already sent tokens to the client is not safe to retry blindly, because the user would see a second answer spliced on.
4. Fallback is a configured second model, not an infinite loop over every provider we have keys for.
5. Errors are mapped to our envelope. A raw vendor body is not a client error.
6. Usage (input tokens, output tokens, provider, model, latency) is a callback or an event. Billing math waits. If we drop the counts, Slot 26 cannot reconstruct them.
7. We pick two providers, not ten. A second provider exists so fallback is real.
8. Keys live in the gateway environment for now. Slot 16 replaces pasted secrets. Logs must not print the provider key.

#### 2. Scale

Model calls are slower and more expensive than CRUD. 1,000 API requests/second does not mean 1,000 model calls/second. Concurrency limits per tenant belong in the runtime (next slot) and must be designed now so one workspace cannot occupy every gateway connection. A retry storm at 5,000 burst multiplies provider cost. The circuit breaker from `@quickstart/utilities` opens when the provider error rate is high, and the gateway returns a typed error instead of retrying.

#### 3. Scenarios

- The provider exceeds the timeout. The caller receives a timeout code. The runtime can stop the turn.
- The provider returns 429. We honor a short backoff once. We do not loop.
- The first model fails before any token, and a fallback model is configured. We call the fallback once.
- The first model fails after tokens were streamed. We do not start a second full answer on the same stream.
- The provider returns a 200 with an error object in JSON. We map it. We do not mark the turn successful.

#### 4. Junior approach vs senior approach

A junior approach calls the vendor SDK from the runtime and retries five times on any error.

A senior approach hides the vendor behind a gateway, times out, retries once when safe, and falls back only when configured.

A staff approach does not adopt a hosted proxy as the product boundary. A library can sit inside our gateway. Our tenancy, timeout, and usage record stay ours. We do not build invoices here.

#### 5. Decision we already made

We build our Model Gateway. We may use a vendor SDK inside it. We do not call providers from the runtime. The failure policy is timeout, then one safe retry, then a fallback model if configured, then a typed error.

#### 6. Small day-1 build

Aqib writes `docs/adr/0010-model-gateway.md`, names the two providers, and spikes one non-streaming completion with a timeout. Hashir writes the mapped error table (timeout, rate limit, provider 5xx) in `docs/api/`. Hashir does not put keys in the doc.

#### 7. Talk split

Aqib prepares timeout, retry, fallback, and the circuit breaker. Hashir prepares the usage fields we must keep, and which errors the client is allowed to see.

#### Day notes

- Date:
- Result:
- Need for Day 20:

---

### Day 20 — BUILD and talk: Model Gateway

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a provider outage must not hang the process or double-charge a retry.

#### Aqib (owns `services/model-gateway`)

- [ ] `complete` and `stream` behind one interface.
- [ ] Timeout, one safe retry, and optional fallback.
- [ ] Map vendor errors to our envelope.
- [ ] Emit a usage record (callback or log event) with token counts. No invoice.

#### Hashir (owns tests)

- [ ] Tests with a fake provider: timeout, 429, and fallback used only when no token has been emitted.
- [ ] Assert the provider key is not in the log line.

#### Talk delivery

Show a timeout and a fallback. Say what is still unsafe (no per-tenant concurrency yet). Measure provider latency, timeout rate, and tokens per call.

#### Done when

The runtime can depend on our gateway instead of a vendor SDK. A provider failure becomes a typed error. Usage counts are not thrown away.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE C — Working agent (Days 21–30)

**Wave goal:** the agent can reply. Later slots add retrieval, memory, and tools to the same loop. We do not replace the runtime.

---

## Slot 11 — Agent runtime

|        |               |
| ------ | ------------- |
| Days   | 21–22         |
| Wave   | C             |
| Status | `not_started` |
| Read   | sections 16   |

**What we already have:** a published agent pointer, a conversation log, and a model gateway.

**What we add now:** the loop is load config, load history, call the model, stream tokens, and save the assistant message.

**Not now:** retrieval (Slot 13) and tools (Slot 15). Add empty ports so we do not rewrite the loop later.

**Why this slot is now:** this is the first user-visible reply. If the loop is hard-coded without ports, every later slot forks a second runtime.

---

### Day 21 — LEARN and small build: a runtime we can extend

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** cancel, timeouts, and a concurrency limit so one tenant cannot spend the whole model budget.

#### 1. Topics to learn before code

1. The runtime is its own service with a fixed pipeline. Stages are added later. The loop is not rewritten.
2. Empty ports now: `Retriever`, `MemoryStore`, and `ToolExecutor`. They return "nothing" until their slots land.
3. The runtime loads the production version pointer, not the draft.
4. Streaming sends tokens through the gateway path and saves the final assistant message at the end. A crash mid-stream must not save a partial message as a successful final answer unless we explicitly mark it partial.
5. Cancel: if the client disconnects, the runtime aborts the model call. It does not keep generating on a dead socket.
6. Context trim: we do not send the entire million-message history. We take the last N turns that fit a budget. The durable log still has everything.
7. Redis holds per-tenant and per-agent concurrency limits. One workspace must not occupy every model connection.
8. A framework graph (LangChain or LangGraph) can be a library inside a stage later. It is not the place we enforce tenancy, cancel, and tracing.

#### 2. Scale

Thousands of concurrent conversations means the runtime is horizontally scaled and stateless. The conversation log is in Postgres. The limit counters are in Redis. If we keep the limit in process memory, two replicas allow twice the budget. Model latency dominates p99. A runtime timeout must be shorter than the gateway timeout so the client gets our error, not a hung proxy.

#### 3. Scenarios

- The model gateway times out. The runtime saves nothing as a completed assistant message, and the client receives the timeout code.
- The client disconnects mid-stream. The model call is cancelled. We do not keep the provider socket open.
- Tenant A is at the concurrency cap. Tenant B can still start a turn.
- The production pointer changes during a turn. This turn finishes on the version it loaded. The next turn loads the new pointer.
- Redis is down. We fail the turn closed rather than running with unlimited concurrency. Say that in the ADR.

#### 4. Junior approach vs senior approach

A junior approach waits for the full completion inside the API process and retries the whole turn on any error.

A senior approach streams, saves once at the end, cancels on disconnect, and limits concurrency in Redis.

A staff approach does not adopt a graph framework as the runtime, and does not put the loop inside the public API process. The API process must stay able to accept requests while model calls wait.

#### 5. Decision we already made

We build our Agent Runtime service as a pipeline of stages. We stream tokens and save the final message at the end. We do not wait for the full answer as the only mode. Concurrency limits live in Redis.

#### 6. Small day-1 build

Aqib writes `docs/adr/0011-agent-runtime.md`, draws the loop with the three empty ports, and spikes a stream from the model gateway to a local client. Hashir writes the cancel and concurrency notes: what the client sees, and what Redis key we will use. Hashir does not edit the runtime service.

#### 7. Talk split

Aqib prepares the pipeline, cancel, and why the version is loaded once per turn. Hashir prepares concurrency limits, what two replicas do, and what "empty ports" means for later slots.

#### Day notes

- Date:
- Result:
- Need for Day 22:

---

### Day 22 — BUILD and talk: Runtime service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** timeout, cancel, and a partial failure that does not corrupt the conversation log.

#### Aqib (owns `services/runtime`)

- [ ] `run` and `stream`.
- [ ] Load production config, load trimmed history, call the model gateway, save the assistant message on success.
- [ ] Cancel on client disconnect.
- [ ] Redis concurrency limit per tenant.

#### Hashir (owns tests with a fake model gateway)

- [ ] Test: timeout does not append a successful assistant message.
- [ ] Test: a second tenant can run when the first tenant is at the cap.
- [ ] Test: empty retriever and tool ports are called and return no extra context.

#### Talk delivery

Show one streamed turn and one timeout. Say what is still unsafe (no retrieval, so answers ignore company documents). Measure in-flight runs, cancel count, and model latency from the runtime's point of view.

#### Done when

An agent can reply on a conversation using the published version. The loop has ports for later stages. A timeout does not pretend the turn succeeded.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 12 — Knowledge ingestion

|        |               |
| ------ | ------------- |
| Days   | 23–24         |
| Wave   | C             |
| Status | `not_started` |
| Read   | section 15    |

**What we already have:** a runtime that answers without documents.

**What we add now:** source, then parse, then chunk, then embed, then index. Jobs are async. Status and retries exist. Answers do not change yet.

**Not now:** retrieval inside the loop (Slot 13).

**Why this slot is now:** embedding on the request path will time out on a real PDF. The index must exist before we teach the runtime to read it.

---

### Day 23 — LEARN and small build: ingestion pipeline

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** async jobs, retries, a dead-letter queue, and delete that removes chunks.

#### 1. Topics to learn before code

1. Document processing is a job, not an HTTP request. A PDF that takes two minutes must not hold a request thread.
2. A thread inside the API process dies with the pod and has no dead-letter queue. SQS (or the local stand-in) plus a worker is the job path.
3. Each source has a status: queued, running, ready, failed. The client polls or reads that status. It does not assume the upload response means "searchable."
4. Chunks are structure-aware where we can do that, with overlap and metadata. Fixed character slices are a fallback, not the design.
5. Every chunk stores `tenant_id` and `source_id`. Embeddings go to OpenSearch, not to the transactional primary.
6. Deleting a source deletes its chunks. A deleted file that remains searchable is a data leak.
7. Retries are bounded. A poison file goes to the DLQ. It does not retry forever and block the queue.
8. Idempotency: the same source version processed twice must not duplicate chunks. Use a source version or a hash.

#### 2. Scale

Millions of chunks across 10,000 organizations make OpenSearch the search store. Postgres stores the source row and the job status. If embeddings sit in Postgres, search load and user writes share one primary. Workers scale separately from the API. A worker crash mid-index must leave the source in `running` or `failed`, not `ready`.

#### 3. Scenarios

- The worker dies after parsing and before indexing. The job becomes visible again or is marked failed. A retry does not create two copies of every chunk.
- OpenSearch is down. The job retries, then DLQ. The source is not `ready`.
- The user deletes the source while a job is running. The job must not recreate chunks after the delete.
- A file from tenant A is indexed with tenant B's id because the worker trusted the message body alone. The worker loads the source row and uses that tenant.

#### 4. Junior approach vs senior approach

A junior approach embeds inside the upload request and stores vectors in the same database as users.

A senior approach queues the job, tracks status, indexes in OpenSearch with tenant metadata, and deletes chunks with the source.

A staff approach does not change the runtime answers in this slot. Wiring retrieval before delete and tenant filters exist would ship leaks. We also do not run local Kubernetes to "scale workers." Compose and a worker process are enough.

#### 5. Decision we already made

Knowledge Service uses SQS, a DLQ, and source status. Chunks are structure-aware, with overlap and metadata. Embeddings go to OpenSearch. A deleted source deletes its chunks.

#### 6. Small day-1 build

Aqib writes `docs/adr/0012-knowledge-ingestion.md` and a worker spike that consumes one queue message and writes a status row. Hashir writes the status state machine and the delete rule in a short note. Hashir does not edit the worker.

#### 7. Talk split

Aqib prepares the queue, the DLQ, and idempotent reprocessing. Hashir prepares tenant metadata on a chunk and what delete must remove.

#### Day notes

- Date:
- Result:
- Need for Day 24:

---

### Day 24 — BUILD and talk: Knowledge service ingest

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a job that can retry without duplicating data, and a delete that cannot leave chunks behind.

#### Aqib (owns `services/knowledge` and the worker)

- [ ] Upload or register a source, enqueue, and process: parse, chunk, embed, index.
- [ ] Status and bounded retries. Failed jobs land in a DLQ path we can inspect.
- [ ] Delete source deletes chunks in OpenSearch.

#### Hashir (owns tests and a fixture file)

- [ ] Test: a failed embed does not mark the source ready.
- [ ] Test: processing the same source version twice does not duplicate chunk ids.
- [ ] A small fixture document. Do not change the worker's queue code while Aqib is in that file.

#### Talk delivery

Show status moving to ready, then a delete. Say what is still unsafe (the runtime does not query the index yet, so a bad tenant filter would be invisible). Measure queue depth, job duration, and DLQ count.

#### Done when

A document can be indexed asynchronously and removed. The runtime answers are unchanged on purpose.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

## Slot 13 — Retrieval in the runtime

|        |                 |
| ------ | --------------- |
| Days   | 25–26           |
| Wave   | C               |
| Status | `not_started`   |
| Read   | sections 15, 16 |

**What we already have:** an index that the runtime does not read, and a runtime loop with an empty retriever port.

**What we add now:** hybrid retrieve, then rerank, then citations, inside the same loop.

**Not now:** retrieval evaluation (Slot 25). A conversation search UI.

**Why this slot is now:** the port exists so we fill it. A second runtime that "does RAG" would fork the product.

---

### Day 25 — LEARN and small build: retrieval we can explain

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the tenant filter is a query filter. It is not a sentence in the prompt.

#### 1. Topics to learn before code

1. Hybrid retrieval means a keyword query and a vector query, then a merge. One signal misses exact policy names. The other misses paraphrase.
2. Rerank reduces the merged list to the chunks we will put in the prompt. More chunks cost tokens and add noise.
3. Citations point at `source_id` and a chunk id the product can show. A citation that is only a sentence the model invented is not a citation.
4. The tenant filter is applied in the OpenSearch query (and any Postgres metadata query). Putting "only use this tenant" in the prompt does not stop the index from returning another tenant's chunk.
5. The retriever is a stage in the existing runtime. It does not start a new service loop.
6. If retrieval times out, the turn fails or continues with an explicit "no documents" flag. It must not silently answer as if documents were used.
7. Deleted sources from Slot 12 must not appear. If they appear, the delete path is broken and this slot does not hide that with a prompt.

#### 2. Scale

Thousands of concurrent conversations that each retrieve will load OpenSearch, not the user primary. A retrieval timeout must be smaller than the runtime's model timeout so we still have time to answer or fail cleanly. At 10,000 organizations, a query without a tenant filter is both a leak and a full-index scan.

#### 3. Scenarios

- Tenant A asks a question whose words also exist in tenant B's documents. Only A's chunks return.
- OpenSearch times out. The turn does not claim citations.
- The top chunk is from a source deleted a second ago. It does not appear after delete has completed. A race during delete is documented: the job and the query can overlap for a short time, and the next query must be clean.
- The model cites a source id that was not in the retrieved set. We do not persist that as a real citation.

#### 4. Junior approach vs senior approach

A junior approach concatenates the top vector hits into the prompt and trusts the model not to cross tenants.

A senior approach filters by tenant in the query, reranks, and stores citations that match returned chunk ids.

A staff approach does not build a retrieval-quality eval harness in this slot. We need one honest path first. Slot 25 measures it. We also do not add a second vector database.

#### 5. Decision we already made

Retrieval is hybrid, then rerank, then citations, inside the same runtime loop. The tenant filter is a hard filter in the query, not a prompt sentence.

#### 6. Small day-1 build

Aqib writes `docs/adr/0013-retrieval.md` and a query spike that returns chunks for one tenant only. Hashir writes two example questions: one that should cite a fixture, and one that must return no chunks for the other tenant. Hashir does not edit the runtime loop on day 1.

#### 7. Talk split

Aqib prepares the query filter, the timeout, and where the stage sits in the loop. Hashir prepares citations: what is stored, and what the model is not allowed to invent.

#### Day notes

- Date:
- Result:
- Need for Day 26:

---

### Day 26 — BUILD and talk: retrieve stage

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a hard tenant filter and a timeout that does not look like a successful grounded answer.

#### Aqib (owns the retriever stage inside `services/runtime` and the query code in `services/knowledge`)

- [ ] Fill the `Retriever` port: hybrid query, rerank, citations.
- [ ] Tenant filter in the query.
- [ ] Timeout path that does not attach fake citations.

#### Hashir (owns tests and fixtures)

- [ ] Test: tenant B's fixture is invisible to tenant A.
- [ ] Test: timeout or empty index produces no citations.
- [ ] Do not edit the runtime loop file while Aqib is editing it. Put assertions in a new test file.

#### Talk delivery

Show one cited answer and one cross-tenant miss. Say what is still unsafe (no eval set, so we do not know if the answer is good, only that it is scoped). Measure retrieval latency and empty-result rate.

#### Done when

The same runtime loop can answer with tenant-scoped citations. A prompt sentence is not the isolation mechanism.

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

**What we already have:** a transcript and a document index. Those are not memory.

**What we add now:** long-term memory records. A memory is not a document and not the full transcript.

**Not now:** a new vector product. Reuse OpenSearch or Postgres.

**Why this slot is now:** if we store "the user likes dark mode" as another RAG document, company knowledge and personal facts become one pile.

---

### Day 27 — LEARN and small build: three stores, three jobs

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** three stores stay separate, and forget means delete.

#### 1. Topics to learn before code

1. Short-term context is the conversation log, plus an optional Redis cursor. It is the recent turns.
2. Knowledge is the company corpus from Slot 12. It is not per end-user preference.
3. Long-term memory is a small set of records per customer and agent, with a TTL or an explicit forget API.
4. Dumping every summary into the system prompt grows without a bound and cannot be deleted cleanly.
5. The memory stage retrieves a few records. It does not load every note ever saved.
6. Memory writes happen after a turn, as a bounded extract, not as a second full transcript.
7. Tenant and end-user scope both matter. Workspace A's memory about a visitor must not load in workspace B.

#### 2. Scale

Memory reads sit on the hot path next to retrieval. The record count per end user must stay small (a handful of rows), or the prompt and the query both degrade. Postgres is enough if we filter by tenant, agent, and subject id with an index. OpenSearch is allowed if we need similarity. We do not add a third database.

#### 3. Scenarios

- The user asks to forget a fact. The next turn does not include that record.
- Two workspaces talk to the same email address. Their memory rows do not mix.
- A memory write fails. The assistant message still stands. Memory is not in the same transaction as the user-visible answer if that would couple a slow extract to the reply. The failure is visible in logs and can be retried idempotently.
- Redis is flushed. Memory remains, because Redis is not the system of record for memory.

#### 4. Junior approach vs senior approach

A junior approach appends summaries to the system prompt forever, or inserts them into the knowledge index.

A senior approach stores separate memory records, retrieves a few, and implements forget.

A staff approach does not merge the three tables "for simplicity." The split is the design. We also do not buy a new vector database for this slot.

#### 5. Decision we already made

Long-term memory is its own record type with TTL, a small retrieve, and a forget API. Short-term stays in Conversation Service. Knowledge stays in Knowledge Service. We do not merge the three.

#### 6. Small day-1 build

Aqib writes `docs/adr/0014-memory.md` and the memory table spike. Hashir writes three examples: a fact that is memory, a fact that is knowledge, and a fact that is only in the transcript. Hashir does not edit the runtime.

#### 7. Talk split

Aqib prepares the read path and the forget delete. Hashir prepares the three-store split with one example each.

#### Day notes

- Date:
- Result:
- Need for Day 28:

---

### Day 28 — BUILD and talk: memory stage

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a bounded read on the hot path, and a delete that actually removes the fact.

#### Aqib (owns memory storage and the runtime memory port)

- [ ] Save, list a few, and forget.
- [ ] Fill `MemoryStore` in the runtime so the prompt includes only the retrieved records.
- [ ] Index or query scoped by tenant and subject.

#### Hashir (owns tests)

- [ ] Test: forget removes the fact from the next load.
- [ ] Test: workspace B cannot read workspace A's memory row.
- [ ] Test: knowledge search does not return a memory row.

#### Talk delivery

Show forget. Say what is still unsafe (extraction quality is heuristic, so a wrong fact can be stored). Measure memory rows read per turn and forget errors.

#### Done when

The runtime can use a few memory records and can forget one. Knowledge documents are unchanged by that write.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 15 — Tools and MCP

|        |               |
| ------ | ------------- |
| Days   | 29–30         |
| Wave   | C             |
| Status | `not_started` |
| Read   | section 18    |

**What we already have:** a runtime with an empty tool port.

**What we add now:** a common tool interface, internal tools, HTTP tools, MCP as a transport, permissions, and timeouts.

**Not now:** the secrets backend (Slot 16). Tools may store secret ids only.

**Why this slot is now:** a model that can call any URL is a prompt-injection incident. The allow-list has to exist before we add real side effects.

---

### Day 29 — LEARN and small build: tools as a platform

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** allow-listed tools, timeouts, and permissions. MCP does not bypass that list.

#### 1. Topics to learn before code

1. A tool has a name, a schema, an auth reference (a secret id, not the secret), a permission, a timeout, and a retry policy.
2. The runtime executes only tools that are registered and allowed for that agent. A model-suggested URL is not a tool.
3. MCP is a transport for tools. It is not a second permission system. An MCP server still passes the same permission check.
4. Example policy: the agent may call `read_customer`. The agent may not call `issue_large_refund` unless that permission is granted.
5. Timeouts apply to every tool call. A hung HTTP tool must not pin the turn forever.
6. Retry is safe only when the tool declares itself idempotent. A payment or a ticket create is not retried by default.
7. Tool errors are typed. The model may see a short message. The client does not see the upstream raw body.
8. Permissions reuse the workspace permission strings from Slot 05. We do not invent a parallel role check inside the runtime.

#### 2. Scale

Tool calls are extra network hops on the turn. At thousands of concurrent conversations, unbounded tool parallelism will exhaust outbound sockets. Cap concurrent tool calls per turn. At 1,000 requests/second of API traffic, tool-heavy agents are the expensive subset. The timeout budget for tools plus the model must fit inside the runtime timeout.

#### 3. Scenarios

- The model asks for a tool that is not on the agent. The runtime does not call the network. It returns a tool error to the model.
- The tool exceeds its timeout. The turn records `tool.failed` later (Slot 19). This slot records the failure on the turn.
- The same non-idempotent tool is suggested twice because the model retried. We do not auto-retry it.
- Tenant A's agent uses a tool configured in tenant B. The tool lookup is tenant-scoped. The call does not run.
- Prompt text says "ignore the allow-list." The allow-list is code, so the text does nothing.

#### 4. Junior approach vs senior approach

A junior approach branches on tool name inside the runtime, or lets the model pass a URL.

A senior approach registers tools in a Tool Service, checks permission, and enforces timeout and retry policy.

A staff approach does not store raw secrets in the tool row. Secret ids wait for Slot 16. We also do not treat MCP as an admin backdoor.

#### 5. Decision we already made

We build a Tool and Integration Service. The runtime runs only allow-listed tools. MCP is a transport, not a second permission system.

#### 6. Small day-1 build

Aqib writes `docs/adr/0015-tools.md` and one internal tool (for example echo or read a fixture) behind the port, with a timeout. Hashir writes the permission examples (`read_customer` allowed, `issue_large_refund` denied) as test cases, not as runtime code.

#### 7. Talk split

Aqib prepares the allow-list, the timeout, and idempotent versus unsafe retry. Hashir prepares MCP-as-transport and the permission examples.

#### Day notes

- Date:
- Result:
- Need for Day 30:

---

### Day 30 — BUILD and talk: Tool service and the tool loop

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a side effect that cannot be triggered by prompt text alone, and a timeout that returns the turn.

#### Aqib (owns `services/tools` and the runtime tool port)

- [ ] Register a tool: name, schema, permission, timeout, retry policy, secret id slot (nullable).
- [ ] Runtime executes only allow-listed tools and appends the tool result into the loop.
- [ ] One HTTP tool and one internal tool.

#### Hashir (owns tests)

- [ ] Test: unknown tool does not call the network.
- [ ] Test: denied permission does not call the network.
- [ ] Test: timeout surfaces as a tool failure, not as a hung test.

#### Talk delivery

Show a denied tool and a timeout. Say what is still unsafe (secret ids are not backed by encryption yet). Measure tool latency and tool failure rate.

#### Done when

The runtime can call an allow-listed tool and can refuse everything else. Wave C is complete.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE D — Channel and operations (Days 31–40)

**Wave goal:** secrets, the first customer channel, human handoff, events, and workflows.

---

## Slot 16 — Secrets

|        |               |
| ------ | ------------- |
| Days   | 31–32         |
| Wave   | D             |
| Status | `not_started` |
| Read   | section 19    |

**What we already have:** tools that can store a secret id and have nowhere safe to put the secret.

**What we add now:** managed secrets, encryption, rotation metadata, and masking.

**Not now:** AWS Secrets Manager wiring. Slot 29 may swap the backend. The interface stays the same.

**Why this slot is now:** the next public channel and real HTTP tools will otherwise put keys in env files and logs.

---

### Day 31 — LEARN and small build: secrets are not env files

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** envelope encryption, show-once, and masking on read.

#### 1. Topics to learn before code

1. A secret has an id, a name, a tenant, ciphertext, and rotation metadata. Callers use the id.
2. Envelope encryption means a data key encrypts the secret, and a master key encrypts the data key. The master key is not stored next to the ciphertext in the same row with no wrapping.
3. The raw secret is returned once on create. List and get APIs return masked values or metadata only.
4. Logs, traces, and error `details` must not contain the raw secret. Add a redaction test.
5. Rotation writes a new version and keeps the previous version until callers move. A rotation that deletes the old value first breaks running workers.
6. The application interface is stable so Slot 29 can replace the local encrypted store with AWS Secrets Manager without rewriting tools.
7. Access control: only a permissioned caller in that tenant can create or reveal. Reveal is a separate audited action, not the default get.

#### 2. Scale

Secret reads happen on tool calls, which is the hot path for agents that call HTTP. Decrypting on every call is acceptable at our tool volume if the master key operation is local. A network call to a KMS on every tool call becomes a latency and availability dependency. Cache the decrypted value in process only for the duration of the call, not in Redis in plaintext.

#### 3. Scenarios

- A list API is logged by a junior debug line. The test fixture's secret must not appear in the log capture.
- Rotation happens while a tool call is in flight. The in-flight call finishes with the version it already decrypted. The next call uses the new version.
- Tenant A requests tenant B's secret id. The result is not found.
- The master key is missing at startup. The process fails fast. It does not store plaintext "temporarily."

#### 4. Junior approach vs senior approach

A junior approach puts the vendor key in `.env` and in the tool JSON.

A senior approach stores ciphertext, returns the raw value once, and masks every later read.

A staff approach does not block the slot on a live AWS KMS account. The interface and the local envelope encryption are the learning. The cloud swap is Slot 29.

#### 5. Decision we already made

We use a secrets interface with a local encrypted store now and AWS Secrets Manager later. After create, the raw secret is shown once. It never appears in list APIs.

#### 6. Small day-1 build

Aqib writes `docs/adr/0016-secrets.md` and a spike that encrypts and decrypts with a local master key. Hashir writes the mask examples: create response versus list response. Hashir does not handle the key material.

#### 7. Talk split

Aqib prepares envelope encryption and rotation. Hashir prepares show-once, masking, and the log redaction test.

#### Day notes

- Date:
- Result:
- Need for Day 32:

---

### Day 32 — BUILD and talk: secrets

**Status:** `not_started` · **Hours:** 6

**Deep focus:** plaintext must not land in logs, list APIs, or another tenant.

#### Aqib (owns `services/secrets`)

- [ ] Create, list masked, and resolve by id for a tool call.
- [ ] Encrypt at rest. Store rotation metadata.
- [ ] Wire tool secret ids to resolve through this service. Do not log the resolved value.

#### Hashir (owns tests)

- [ ] Test: list does not contain the raw secret.
- [ ] Test: another tenant cannot resolve the id.
- [ ] Test: a log line from the resolve path does not contain the fixture secret.

#### Talk delivery

Show create-once and a masked list. Say what is still unsafe (one local master key, no cloud KMS, no automatic rotation job). Measure decrypt failures and access denied.

#### Done when

Tools can hold a secret id. The raw secret is not in the list API and not in logs.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 17 — Website chat widget

|        |               |
| ------ | ------------- |
| Days   | 33–34         |
| Wave   | D             |
| Status | `not_started` |
| Read   | section 23    |

**What we already have:** a runtime that can stream, and no browser client that is safe to embed.

**What we add now:** an embeddable widget with streaming, history, typing, reconnect, tool-call events, and optional visitor auth.

**Not now:** the inbox UI (Slot 18). Voice. Extra marketing-site polish.

**Why this slot is now:** this is the first channel a customer website can load. It must not contain a secret key.

---

### Day 33 — LEARN and small build: a real widget

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** a publishable key, an origin allow-list, and reconnect by `seq`.

#### 1. Topics to learn before code

1. The browser bundle contains a publishable key, not a secret API key. A secret in JavaScript is public.
2. The gateway checks the origin allow-list for that publishable key. A copied snippet on another domain fails.
3. The widget talks only to the gateway. It does not call the runtime or conversation service hostnames.
4. Transport: SSE for tokens plus REST to send, unless we need full duplex. We pick one and keep it. WebSocket is the step up, not the default, because reconnect and proxies are harder.
5. Reconnect uses `conversation_id` and the last `seq`. A refresh must not start a new conversation when the visitor is known.
6. Typing and tool-call events are messages on the same stream, with a type field. They are not a second undocumented socket.
7. Visitor auth is optional. Anonymous visitors still sit in a tenant, because the publishable key maps to a workspace.

#### 2. Scale

The widget multiplies connections. Thousands of concurrent conversations mean thousands of held SSE connections on the gateway. The gateway must not do model work on that connection. It proxies the stream. Connection count, not CPU, is the first limit. Heartbeats keep proxies from closing idle streams.

#### 3. Scenarios

- The page reloads mid-answer. The client requests messages after the last `seq` and resumes.
- The snippet is copied to a domain that is not allowed. The gateway returns 403.
- The network drops. The client reconnects with the same conversation id. It does not create a second conversation.
- A tool call event arrives. The UI can show it. The UI does not receive the tool secret.

#### 4. Junior approach vs senior approach

A junior approach iframes the whole dashboard or pastes a secret key into the snippet.

A senior approach ships a small package, a publishable key, an origin allow-list, and a stream that can resume.

A staff approach does not build the inbox in the same codebase this slot. The widget is the visitor surface. The inbox is the operator surface. They share the conversation id. They do not share a deployment that forces operators to load the embed script.

#### 5. Decision we already made

We build a widget package plus a publishable key, an origin allow-list, and a streaming API. Secret keys never ship in the browser. Reconnect uses `conversation_id` and last `seq`.

#### 6. Small day-1 build

Aqib writes `docs/adr/0017-widget.md` and a gateway route that accepts a publishable key and checks a hard-coded origin. Hashir scaffolds the widget package UI shell (connect button, message list) against a mocked stream. Hashir does not edit gateway auth code.

#### 7. Talk split

Aqib prepares the publishable key, the origin check, and why SSE is proxied. Hashir prepares reconnect and what the browser is allowed to store.

#### Day notes

- Date:
- Result:
- Need for Day 34:

---

### Day 34 — BUILD and talk: widget and public chat API

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a public client that can resume, and a gateway that rejects the wrong origin.

#### Aqib (owns gateway public chat routes)

- [ ] Public send and stream routes behind the publishable key and origin allow-list.
- [ ] Map the key to a workspace. Do not accept a workspace id from the browser as authority.

#### Hashir (owns the widget package)

- [ ] Render history, streaming tokens, typing, and tool-call events.
- [ ] Reconnect with `conversation_id` and last `seq`.
- [ ] Do not put a secret in the package. Do not edit the gateway route file.

#### Talk delivery

Show a reload that resumes, and a blocked origin. Say what is still unsafe (no inbox, so a human cannot take over). Measure connected streams and reconnect rate.

#### Done when

A page can embed the widget and talk to the published agent through the gateway. The secret key is not in the browser.

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

**What we already have:** one conversation log and a visitor widget.

**What we add now:** a unified inbox, assignment, AI to human, human to AI, and an escalation reason.

**Not now:** shift scheduling.

**Why this slot is now:** copying the transcript into a ticket tool creates two sources of truth. Handoff has to be a participant on the same conversation.

---

### Day 35 — LEARN and small build: human is a participant

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** one transcript, and a claim that two operators cannot both win.

#### 1. Topics to learn before code

1. Escalation sets conversation state to `waiting_human` and adds a human participant. The runtime pauses until the conversation returns to AI.
2. The inbox reads the same conversation service. It does not import a second transcript.
3. Claim and release use optimistic locking (a version or a `claimed_by` check). Two humans must not own the same thread.
4. The escalation reason is stored. Operators need to know why the AI stopped.
5. An operator message is a message row with a human author. It is not a side channel.
6. Return-to-AI clears the waiting state and records who returned it.
7. Tenant scope: an operator in workspace A does not see workspace B's queue.

#### 2. Scale

The inbox is a human-speed API, not 1,000 claims per second. The risk at scale is a queue query that scans every conversation in the database. The queue query filters by tenant and state and uses an index on `(workspace_id, state, updated_at)`. Polling from many operator browsers must be cheap. A websocket fan-out can wait. Short polling with that index is enough.

#### 3. Scenarios

- Two operators click claim. One gets the thread. The other gets a conflict and refreshes.
- The AI tries to continue while state is `waiting_human`. The runtime does not call the model.
- The operator sends a message and the pod dies before commit. The client retries with an idempotency key. One message is stored.
- Workspace A lists the inbox. Workspace B's waiting threads are absent.

#### 4. Junior approach vs senior approach

A junior approach emails a transcript or opens a ticket in another system and lets both systems drift.

A senior approach keeps one conversation, changes state, and uses optimistic locking on claim.

A staff approach does not build shift scheduling, skills-based routing, or a second message store. Those are products. This slot is the state machine.

#### 5. Decision we already made

The human is a participant on the same conversation. State becomes `waiting_human`. The runtime pauses. Claim and release use optimistic locking.

#### 6. Small day-1 build

Aqib writes `docs/adr/0018-inbox-handoff.md` and the state values in the ADR. Hashir writes the operator stories (escalate, claim, reply, return) as a checklist. Hashir does not edit conversation tables on day 1.

#### 7. Talk split

Aqib prepares the lock and the runtime pause. Hashir prepares the operator stories and why a second transcript is rejected.

#### Day notes

- Date:
- Result:
- Need for Day 36:

---

### Day 36 — BUILD and talk: inbox

**Status:** `not_started` · **Hours:** 6

**Deep focus:** optimistic locking on claim, and a runtime that stays quiet while a human owns the thread.

#### Aqib (owns inbox and conversation state changes)

- [ ] Inbox query, assign, escalate, return-to-AI, and operator message.
- [ ] Optimistic lock so two claims cannot both succeed.
- [ ] Runtime checks state and does not call the model while waiting for a human.

#### Hashir (owns tests and a minimal inbox page if the API is stable)

- [ ] Test: second claim conflicts.
- [ ] Test: cross-workspace queue is empty of the other tenant.
- [ ] A simple list page or HTTP file that calls the API. Do not edit the lock implementation.

#### Talk delivery

Show two claims and a paused runtime. Say what is still unsafe (no presence, so a crashed browser can hold a claim until timeout). Measure claim conflicts and time in `waiting_human`.

#### Done when

A human can take a thread, reply on the same transcript, and hand it back. Two operators cannot both own it.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 19 — Event platform

|        |                    |
| ------ | ------------------ |
| Days   | 37–38              |
| Wave   | D                  |
| Status | `not_started`      |
| Read   | sections 8, 29, 41 |

**What we already have:** services that change state and do not publish a durable event.

**What we add now:** Kafka topics, producers, consumers, idempotency, a dead-letter path, and replay notes.

**Not now:** the workflow graph (Slot 20). A billing consumer can be a stub.

**Why this slot is now:** workflows, audit, and usage need a bus. Emitting after a successful demo with no outbox will lose events the first time a process crashes.

---

### Day 37 — LEARN and small build: events are not a second database

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the transactional outbox, and consumers that are idempotent.

#### 1. Topics to learn before code

1. Kafka is for business events that several consumers may read and that we may replay. SQS remains the tool for work queues.
2. The service that owns the write emits the event. A central "event service" that polls other databases will drift.
3. The transactional outbox writes the event row in the same database transaction as the business row. A publisher process sends the outbox to Kafka. If we emit after commit and the process dies, the event is lost. If we emit before commit and the transaction rolls back, the event is a lie.
4. Consumers are idempotent. Delivery is at-least-once. A second delivery must not create a second side effect.
5. The idempotency store is keyed by event id (and consumer name). It lives in Postgres or Redis with a TTL that matches how long we might replay.
6. A poison message goes to a dead-letter path after bounded retries. It does not block the partition forever without a way to inspect it.
7. Events we can emit now include `agent.created`, `agent.updated`, `conversation.started`, `message.created`, `tool.called`, `tool.failed`, and `agent.escalated`.
8. The event is not the source of truth for the current agent row. The database is. Replay rebuilds consumers. It does not replace the primary.

#### 2. Scale

Millions of messages per day means `message.created` is a high-volume topic. A consumer that does a slow synchronous HTTP call inside the poll loop will fall behind. Lag is the metric. Partitions must be enough to parallelize, and the key should keep one conversation's events ordered (key by conversation id) where order matters. A single partition is a demo.

#### 3. Scenarios

- The process crashes after the database commit and before a naive broker publish. With the outbox, the publisher sends the row later. Without the outbox, the consumer never sees the change.
- The same event is delivered twice. The consumer's idempotency key makes the second call a no-op.
- A consumer throws forever on one payload. After the retry budget, the message is dead-lettered and the partition moves on.
- Tenant id is missing on the event. The consumer rejects it. It does not apply the change to a default tenant.

#### 4. Junior approach vs senior approach

A junior approach calls the broker after `commit()` and hopes, or uses webhooks as the only bus.

A senior approach uses an outbox, idempotent consumers, and a dead-letter path.

A staff approach does not move every job onto Kafka. Jobs stay on SQS. We also do not build the workflow engine in this slot. We only make the trigger reliable.

#### 5. Decision we already made

Kafka carries business events. SQS still carries jobs. We use a transactional outbox. Consumers are idempotent. The service that owns the row emits the event.

#### 6. Small day-1 build

Aqib writes `docs/adr/0019-events.md` and an outbox table spike in one service (agent or conversation). Hashir writes the event catalog with required fields (`event_id`, `tenant_id`, `type`, `occurred_at`) in `docs/events/`. Hashir does not edit the outbox publisher.

#### 7. Talk split

Aqib prepares the outbox transaction and crash window. Hashir prepares idempotency, lag, and the dead-letter path.

#### Day notes

- Date:
- Result:
- Need for Day 38:

---

### Day 38 — BUILD and talk: events

**Status:** `not_started` · **Hours:** 6

**Deep focus:** no lost event on crash, and no double side effect on replay.

#### Aqib (owns the outbox and the publisher)

- [ ] Outbox table and a publisher to Kafka.
- [ ] Emit the catalog events from the owning services he is already allowed to touch. If a service is large, start with `message.created` and `agent.escalated`.
- [ ] Dead-letter path after bounded consumer retries.

#### Hashir (owns one sample consumer and its tests)

- [ ] A consumer group that records event ids it has handled.
- [ ] Test: delivering the same event twice does not duplicate the side effect.
- [ ] Do not edit the outbox transaction while Aqib is in that file.

#### Talk delivery

Explain the crash window the outbox closes. Say what is still unsafe (not every service emits yet, so a new write can still be invisible). Measure consumer lag and dead-letter count.

#### Done when

At least one real state change is durable on Kafka via the outbox, and a consumer can replay it without doubling the side effect.

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

**What we already have:** events that nothing business-specific consumes yet.

**What we add now:** trigger, then condition, then action, with retry, state, idempotency, and timeout.

**Not now:** campaign or lead actions. Do not fake those domains.

**Why this slot is now:** escalation already exists. A workflow can notify on `agent.escalated` without waiting for a third-party automation product.

---

### Day 39 — LEARN and small build: a workflow engine we can explain

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** idempotent steps, and a retry that does not call the customer twice.

#### 1. Topics to learn before code

1. A workflow run has an id. Each step has a key. The pair is the idempotency key. A replay must not send two notifications.
2. The trigger is a Kafka event, not a cron that scans all conversations.
3. Conditions are JSON we can evaluate (state equals `waiting_human`). They are not arbitrary code from the tenant in this slot.
4. Actions that can fail go through SQS with retries and a timeout. A long timer inside the API process dies with the pod.
5. Run state is in Postgres: pending, running, succeeded, failed. The event log is not the only place we look up "did this run."
6. Temporal (or a similar engine) is the later upgrade if we need workflows that sleep for days. We write that in the ADR. We do not operate Temporal in this slot.
7. The one real workflow this slot ships: `agent.escalated` then a notify action (log or email stub).

#### 2. Scale

Workflow volume follows escalations and other business events, not every token of a stream. A hot loop that starts a workflow per token will melt the database. Triggers subscribe to business events only. Step retries use the queue. A stuck step must time out so the run does not stay `running` forever and block operators from understanding the inbox.

#### 3. Scenarios

- The notify action succeeds and the consumer crashes before it marks the step done. Redelivery hits the idempotency key and does not notify twice.
- The condition does not match. The run completes with no action. It is not an error.
- The action times out. The run is failed after the retry budget. The inbox conversation is unchanged.
- The same event is replayed from Kafka. A second run is not created if the event id was already bound to a run.

#### 4. Junior approach vs senior approach

A junior approach calls the notification inline in the inbox request, or embeds a third-party automation tool we cannot failure-test.

A senior approach starts a run from the event, stores step state, and retries through a queue with an idempotency key.

A staff approach does not stand up Temporal for one notify step. We leave an ADR note that long timers are the reason to move later. We do not invent campaign actions that have no campaign service yet.

#### 5. Decision we already made

We build our Workflow Service for this program: Kafka trigger, JSON condition, SQS step retries. Temporal is documented as the later upgrade. Idempotency is `workflow_run_id` plus the step key.

#### 6. Small day-1 build

Aqib writes `docs/adr/0020-workflows.md` and the run-state table. Hashir writes the one workflow in words: trigger, condition, action, and what "twice" must not do. Hashir does not edit the worker.

#### 7. Talk split

Aqib prepares step state and the queue retry. Hashir prepares the idempotency story and why Temporal can wait.

#### Day notes

- Date:
- Result:
- Need for Day 40:

---

### Day 40 — BUILD and talk: Workflow service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a replayed event must not perform the action twice.

#### Aqib (owns `services/workflow`)

- [ ] Trigger on `agent.escalated`, evaluate the condition, enqueue the notify step.
- [ ] Persist run and step state.
- [ ] Idempotency key on the step. Timeout and bounded retries.

#### Hashir (owns tests)

- [ ] Test: two deliveries of the same event produce one notification.
- [ ] Test: a failed action ends in the failed state after retries.
- [ ] Do not add campaign actions.

#### Talk delivery

Show one escalate-to-notify run and one replay. Say what is still unsafe (notify is a stub, so we have not proven an email provider). Measure run failures and duplicate-suppression count.

#### Done when

An escalation can start a workflow we can explain, including the retry and the idempotency key. Wave D is complete.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

# WAVE E — Voice and growth (Days 41–50)

**Wave goal:** voice on the same runtime, then campaigns, leads, and evaluation.

---

## Slot 21 — Voice path

|        |                |
| ------ | -------------- |
| Days   | 41–42          |
| Wave   | E              |
| Status | `not_started`  |
| Read   | sections 7, 25 |

**What we already have:** a text runtime and a conversation log.

**What we add now:** PSTN or SIP, then telephony, then a voice gateway, then a realtime session, then STT, then the same runtime, then TTS, then audio. Inbound and outbound call lifecycle.

**Not now:** barge-in, voicemail policy, and the campaign dialer (slots 22 and 23). First get a working call.

**Why this slot is now:** voice is a channel. It is not a second agent engine. If we build a separate brain, tools and versions will fork.

---

### Day 41 — LEARN and small build: realtime is a different subsystem

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the session state machine is ours. The vendor transports audio. The runtime is the same one.

#### 1. Topics to learn before code

1. A voice turn is streaming audio in, partial text from STT, a runtime turn, and streaming audio out from TTS. Recording the whole call and answering later is not a voice agent.
2. The vendor (for example Twilio, or SIP plus a speech vendor) does not own the agent. Our Voice Service owns the session state machine.
3. The call creates a conversation with `channel=voice`. There is no second history table.
4. The runtime is called for the turn. We do not duplicate prompts inside the voice service.
5. Session states include ringing, active, ending, and ended. Illegal transitions are rejected.
6. A call has a concurrency slot. Hundreds of concurrent calls is the design target. The slot is reserved in Redis so two replicas cannot both accept the 201st call when the cap is 200.
7. Timeouts exist on STT and on the runtime. A silent failure must move the session to a defined end, not leave it `active` forever.

#### 2. Scale

Hundreds of concurrent calls means hundreds of long-lived media sessions, which is a different resource from HTTP requests. The voice service scales out, but media servers and provider accounts have their own caps. Stateless signaling plus a Redis map of active calls is the shape. In-memory call maps break as soon as two pods run, because the load balancer sends the next webhook to a pod that does not know the call.

#### 3. Scenarios

- The caller hangs up during TTS. The session moves to ended. The runtime call is cancelled. We do not keep paying for tokens.
- The STT socket dies. The session ends or retries once, as the ADR states. It does not loop reconnect forever.
- Two pods receive webhooks for one call. Session state is in Redis or Postgres, not in one process.
- The conversation row is written with the wrong workspace. The publishable or dialed number maps to the tenant. The webhook body is not the authority.

#### 4. Junior approach vs senior approach

A junior approach uses a vendor "AI phone" product that never calls our runtime, or waits until the call ends to transcribe.

A senior approach keeps our state machine, reuses the runtime, and stores the transcript on the conversation.

A staff approach does not implement barge-in, recording storage, and the dialer in the same slot. A working inbound or outbound call is the proof. Reliability is the next slot.

#### 5. Decision we already made

We build a Voice Service plus a vendor for telephony and speech, and we call the same Agent Runtime. We do not record-then-answer as the design, and we do not outsource the agent. The provider choice is written in the ADR. The state machine is ours. Calls use `channel=voice` on the existing conversation.

#### 6. Small day-1 build

Aqib writes `docs/adr/0021-voice-path.md` with the provider choice and the state list, and spikes one state transition stored outside process memory. Hashir draws the hop list (phone, vendor, voice service, runtime, TTS) in one diagram note. Hashir does not edit the voice service.

#### 7. Talk split

Aqib prepares the state machine and why two pods cannot keep calls in memory. Hashir prepares the hop list and why the transcript uses the conversation service.

#### Day notes

- Date:
- Result:
- Need for Day 42:

---

### Day 42 — BUILD and talk: Voice service happy path

**Status:** `not_started` · **Hours:** 6

**Deep focus:** one call that uses the existing runtime, and session state that survives a second replica.

#### Aqib (owns `services/voice`)

- [ ] Inbound or outbound lifecycle for one happy path.
- [ ] Create the conversation with `channel=voice`.
- [ ] Send the caller utterance to the runtime and play TTS from the reply.
- [ ] Store active-call state in Redis, not only in the process.

#### Hashir (owns a scripted test or a documented manual script)

- [ ] A test double for STT and TTS so CI does not need a phone.
- [ ] Assert the conversation channel and the workspace id.
- [ ] Do not implement barge-in.

#### Talk delivery

Walk one call's states. Say what is still unsafe (no barge-in, no recording, a dropped STT socket is not fully handled). Measure active calls and turn latency.

#### Done when

A call can complete and the transcript lives on the normal conversation. The runtime is not forked.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 22 — Voice reliability

|        |                    |
| ------ | ------------------ |
| Days   | 43–44              |
| Wave   | E                  |
| Status | `not_started`      |
| Read   | sections 25–26, 38 |

**What we already have:** a happy-path call.

**What we add now:** voice activity detection, barge-in, recording, transcripts, provider failure, silence, reconnect, transfer, and concurrency limits.

**Not now:** campaign pacing (Slot 23).

**Why this slot is now:** a demo call that talks over the user or loses audio on a blip is not the reliability story the project is for.

---

### Day 43 — LEARN and small build: voice failure matrix

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** for each dependency, detect, respond, retry or fallback, recover, and check the data afterward.

#### 1. Topics to learn before code

1. For STT timeout, TTS failure, LLM latency, caller disconnect, barge-in, silence, and transfer failure, write: what fails, how we detect it, what we do now, whether we retry, whether we fall back, how we recover, and how we check data after.
2. Barge-in: on voice activity, stop TTS, cancel an in-flight model call if needed, and start a new turn. Ignoring barge-in makes the agent talk over the caller.
3. Recording audio goes to object storage (S3 or the local stand-in). The transcript goes on the conversation. Redis is not the audio store.
4. Silence has a timeout that ends or re-prompts. An open session with no audio still holds a concurrency slot until we release it.
5. Reconnect of the media socket is bounded. An infinite reconnect loop holds the slot and the provider bill.
6. Transfer moves the call to a human or a number and ends our media role in a defined state.
7. The concurrency semaphore in Redis is acquired at answer time and released on every end path, including errors.

#### 2. Scale

Hundreds of concurrent calls times a missing release on the error path becomes a deadlock: the semaphore stays full and new calls fail while no audio is flowing. Latency budgets are tighter than chat. STT plus model plus TTS must fit a conversational pause. A model timeout that is acceptable in chat is too slow here, so the voice path uses a shorter runtime budget.

#### 3. Scenarios

- The caller speaks during TTS. TTS stops. The old model call is cancelled. One new turn starts. Two answers do not play at once.
- STT times out. The caller hears a defined failure or a retry once. The call does not stay active with no owner.
- The process crashes. The semaphore key has a TTL so the slot returns. We do not depend only on a graceful shutdown.
- Recording upload fails. The call can still end. The transcript is still saved. The missing recording is a visible error, not a silent success.

#### 4. Junior approach vs senior approach

A junior approach ignores barge-in and writes audio bytes into Redis or the local disk of the pod.

A senior approach stops TTS on voice activity, stores audio in object storage, stores text on the conversation, and puts a TTL on the concurrency key.

A staff approach does not build a full contact-center dialer here. Pacing and opt-out belong to campaigns.

#### 5. Decision we already made

On voice activity we stop TTS, cancel the in-flight model call if needed, and start a new turn. Recording audio goes to object storage. The transcript goes on the conversation.

#### 6. Small day-1 build

Aqib writes `docs/adr/0022-voice-reliability.md` and the failure matrix for the seven cases. Hashir lists the latency metrics (STT, runtime, TTS, time-to-first-audio) in the ADR or a short metrics note. Hashir does not edit the media code on day 1.

#### 7. Talk split

Aqib prepares barge-in and cancel. Hashir prepares the failure matrix for STT, silence, and the semaphore TTL.

#### Day notes

- Date:
- Result:
- Need for Day 44:

---

### Day 44 — BUILD and talk: reliable voice

**Status:** `not_started` · **Hours:** 6

**Deep focus:** barge-in cancels work, and every end path releases the concurrency slot.

#### Aqib (owns `services/voice` reliability)

- [ ] Voice activity detection, interrupt, and cancel.
- [ ] Recording to object storage and transcript on the conversation.
- [ ] Redis concurrency semaphore with a TTL.
- [ ] Transfer and silence timeout.

#### Hashir (owns failure tests with fakes)

- [ ] Test: end-on-error releases the semaphore.
- [ ] Test: barge-in does not leave two TTS streams running in the fake.
- [ ] Do not add campaign pacing.

#### Talk delivery

Walk one interrupt and one crashed-call TTL. Say what is still unsafe (provider failover is limited to what the chosen vendor allows). Measure time-to-first-audio and active-call gauge.

#### Done when

A call can be interrupted, recorded, and ended without leaking a concurrency slot.

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

**What we already have:** a voice path that can place a call when asked.

**What we add now:** campaign, audience, schedule, timezone, pacing, retries, pause and resume, outcomes, and opt-out.

**Not now:** lead scoring (Slot 24). The audience can be a CSV or an API.

**Why this slot is now:** a for-loop inside one HTTP request will die mid-list and double-dial on retry.

---

### Day 45 — LEARN and small build: a dialer is a queue with rules

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** pacing, idempotent dial keys, and opt-out checked at dial time.

#### 1. Topics to learn before code

1. A campaign is a definition. Audience rows are work items. The scheduler enqueues due rows. A worker places calls through the voice service.
2. A for-loop in one HTTP request dies when the pod dies and retries from the start.
3. A cron that dumps every call at 09:00 ignores timezone, pacing, and opt-out.
4. An idempotent dial key (campaign id plus contact id plus attempt) stops a redelivered queue message from dialing twice.
5. Opt-out is checked at dial time, not only at import. A person can opt out after the CSV was loaded.
6. Pacing uses the same concurrency idea as voice: do not exceed the call cap, and do not exceed a campaign rate.
7. Outcome counters can be eventually consistent. A missed increment on a dashboard is acceptable. A double dial is not.
8. Pause stops new enqueues. In-flight calls finish or follow the pause rule written in the ADR. Say which one.

#### 2. Scale

A campaign of tens of thousands of rows must not become tens of thousands of simultaneous calls. The queue and the Redis cap are the backpressure. Workers are stateless. Schedule math uses the contact timezone. A single-threaded scheduler that loads the entire audience into memory will not survive the large list.

#### 3. Scenarios

- The worker crashes after the vendor accepts the call and before it marks the row. Redelivery sees the dial key and does not dial again.
- The contact opts out after import and before dial. The worker skips the row.
- Pause is pressed. No new calls start. The ADR's rule for in-flight calls holds.
- Two campaigns share the voice cap. One campaign cannot take every slot if we also enforce a per-campaign pace. Write the rule we actually implement.

#### 4. Junior approach vs senior approach

A junior approach loops in the request or fires every row at once from cron.

A senior approach uses audience rows, a scheduler, a queue, Redis concurrency, and an idempotent dial key, and checks opt-out at dial time.

A staff approach does not build lead scoring or a CRM in this slot. Counters may lag. Dials may not duplicate.

#### 5. Decision we already made

We build a Campaign Service. Audience rows, a scheduler, SQS work, Redis concurrency, and idempotent dial keys. Opt-out is checked at dial time, not only at import.

#### 6. Small day-1 build

Aqib writes `docs/adr/0023-campaigns.md` and the audience-row states. Hashir writes one example schedule (timezone, pace, retry, opt-out) as a fixture JSON. Hashir does not edit the worker.

#### 7. Talk split

Aqib prepares the dial key and the crash window. Hashir prepares opt-out-at-dial-time and why counters may lag.

#### Day notes

- Date:
- Result:
- Need for Day 46:

---

### Day 46 — BUILD and talk: Campaign service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** backpressure and idempotent dials.

#### Aqib (owns `services/campaign`)

- [ ] Campaign, audience, schedule, pause, and resume.
- [ ] Worker dials through the voice service with an idempotency key.
- [ ] Opt-out checked in the worker immediately before dial.

#### Hashir (owns tests)

- [ ] Test: redelivered work does not dial twice.
- [ ] Test: an opted-out row is skipped.
- [ ] Do not implement lead scoring.

#### Talk delivery

Show a skip and a duplicate suppression. Say what is still unsafe (a real carrier sandbox may still be stubbed). Measure queue depth and dials suppressed.

#### Done when

A campaign can place paced calls, skip opt-outs at dial time, and survive a redelivered job without a double dial.

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

**What we already have:** conversations and campaigns, and no lead record.

**What we add now:** a lead object, a source, a score hook, campaign enroll, and a CRM update as a tool or an event.

**Not now:** a full CRM product.

**Why this slot is now:** storing leads as conversation metadata makes scoring and enrollment hard to query.

---

### Day 47 — LEARN and small build: leads are a domain

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the lead is the record. The conversation is a link, not the storage.

#### 1. Topics to learn before code

1. A lead has status, score, owner, source, and links to a conversation and a campaign. Those fields are columns we filter on.
2. The flow is source, then `lead.created`, then a workflow may run a qualification agent, then score, then maybe enroll a campaign, then a CRM tool.
3. Enrollment calls the campaign service. It does not insert audience rows by writing another service's tables.
4. Score is a field with a version. Two scorers must not lose updates silently. Use the same optimistic concurrency idea as agents.
5. Tenant scope sits on the lead. A conversation link is not authorization.
6. The CRM update is a tool call or an outbound event. This service does not embed a CRM.

#### 2. Scale

Lead volume follows conversations and form posts, not token streaming. The list API is filtered by tenant and status with an index. A score job is a queue consumer, not a request that holds the HTTP thread while a model runs. At 10,000 organizations, a global "recent leads" query without a tenant predicate is both slow and a leak.

#### 3. Scenarios

- The same form is submitted twice. An idempotency key or a unique source id returns the original lead.
- Qualification workflow runs twice on the same event. The score write is idempotent or versioned.
- Enroll is called and the campaign service is down. The lead stays in a state that can retry. It is not marked enrolled.
- Workspace B requests workspace A's lead id. The result is not found.

#### 4. Junior approach vs senior approach

A junior approach hides lead fields inside the conversation JSON.

A senior approach gives leads their own service, emits `lead.created`, and enrolls through the campaign API.

A staff approach does not build a CRM. The CRM is a tool at the edge.

#### 5. Decision we already made

We build a Lead Service. We do not store leads only as conversation metadata.

#### 6. Small day-1 build

Aqib writes `docs/adr/0024-leads.md` and the lead table spike. Hashir writes the flow in `docs/architecture/lead-flow.md` (source, event, score, enroll, CRM tool) without implementing the CRM.

#### 7. Talk split

Aqib prepares idempotent create and the enroll call. Hashir prepares why the conversation is only a link.

#### Day notes

- Date:
- Result:
- Need for Day 48:

---

### Day 48 — BUILD and talk: leads

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a lead write that is tenant-scoped and safe to retry.

#### Aqib (owns `services/leads`)

- [ ] Create, update score, and link conversation.
- [ ] Emit `lead.created` through the outbox.
- [ ] Enroll action that calls the campaign service.

#### Hashir (owns tests)

- [ ] Test: duplicate source id does not create two leads.
- [ ] Test: cross-tenant read fails.
- [ ] A workflow action name `enroll_campaign` documented against the real route. Do not edit the lead transaction while Aqib is in it.

#### Talk delivery

Show one create and one duplicate. Say what is still unsafe (qualification agent quality is not measured). Measure create conflicts and enroll failures.

#### Done when

A lead can be created, scored, and enrolled without writing another service's tables directly.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 25 — Evaluation

|        |               |
| ------ | ------------- |
| Days   | 49–50         |
| Wave   | E             |
| Status | `not_started` |
| Read   | section 31    |

**What we already have:** agents and versions, and no measurement.

**What we add now:** datasets, runners, scores, and a comparison between versions.

**Not now:** a new product domain after this wave.

**Why this slot is now:** publish can move a pointer. Without a dataset, we cannot say the new version is worse.

---

### Day 49 — LEARN and small build: measure, do not guess

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** eval is a job, not a ten-minute HTTP request.

#### 1. Topics to learn before code

1. A case has input, expected behavior, expected tool, and expected answer where those are deterministic.
2. An LLM-as-judge score is optional and noisy. It does not replace a deterministic check.
3. A run executes many cases. It is an SQS job. An HTTP request that waits for the whole dataset will time out and will be retried into a second run.
4. Scores are stored per run and per case. Comparing version N to version N+1 is a read of those rows.
5. The runner calls the runtime the same way production does, including tenant scope. A case that forgets the tenant is an invalid case.
6. Latency and failure rate are part of the score. A correct answer that exceeds the voice budget fails a voice case.
7. The dataset is tenant-owned or platform-owned and marked as such. Platform cases must not contain one customer's private documents.

#### 2. Scale

A dataset of hundreds of cases times a model call is a queue, a concurrency cap, and a cost cap. The runner must not ignore the model gateway timeout. At evaluation time we can spend more latency than a live call, but we still bound parallelism so an eval cannot consume the whole provider budget and starve production turns.

#### 3. Scenarios

- The runner pod dies mid-dataset. The job retries. Completed cases are not executed twice (case attempt key).
- The judge model is down. Deterministic checks still record. The judge section is failed, not invented.
- Version N+1 drops a tool call the case required. The compare view shows the miss.
- A case includes tenant B's document id while running as tenant A. The runner refuses the case.

#### 4. Junior approach vs senior approach

A junior approach clicks the widget and decides the agent "seems fine," or trusts only an LLM judge.

A senior approach stores a golden set, runs it as jobs, and compares versions with deterministic checks plus an optional judge.

A staff approach does not block all publishes on a green eval yet if the gate is not in the LLD. If we add the gate, it must fail open or closed explicitly. Write which one. Default for this slot: record the score, do not hard-block publish unless the ADR says so.

#### 5. Decision we already made

We use a golden dataset, deterministic checks, an optional LLM judge, and latency and failure metrics. Eval runs are SQS jobs, not a long HTTP request.

#### 6. Small day-1 build

Aqib writes `docs/adr/0025-evaluation.md` and the case and run tables. Hashir writes five golden cases in a fixture file (input and expected tool or expected phrase). Hashir does not edit the runner.

#### 7. Talk split

Aqib prepares the job, the attempt key, and the concurrency cap. Hashir prepares what a case contains and why a judge is optional.

#### Day notes

- Date:
- Result:
- Need for Day 50:

---

### Day 50 — BUILD and talk: Evaluation service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a rerun that does not double-call completed cases, and a compare between two versions.

#### Aqib (owns `services/evaluation`)

- [ ] Dataset, case, run, and scores.
- [ ] Worker executes cases through the runtime with a concurrency cap.
- [ ] Compare two versions.

#### Hashir (owns the fixture cases and tests)

- [ ] Load the five cases.
- [ ] Test: a redelivered case does not call the runtime twice.
- [ ] Do not edit the worker loop while Aqib is in it.

#### Talk delivery

Show a compare. Say what is still unsafe (five cases do not prove quality). Measure run duration, case failures, and judge failures separately.

#### Done when

We can run a dataset as jobs and see a difference between two agent versions. Wave E is complete.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

# WAVE F — Harden and ship (Days 51–60)

**Wave goal:** money, audit, alerts, cloud, and proof. No new product domain.

---

## Slot 26 — Usage, cost, and billing

|        |                |
| ------ | -------------- |
| Days   | 51–52          |
| Wave   | F              |
| Status | `not_started`  |
| Read   | sections 32–33 |

**What we already have:** usage hooks from the model gateway, and no ledger.

**What we add now:** meters by organization, agent, campaign, conversation, model, and provider. Then plans, quotas, credits, subscription status, invoices, and overage.

**Not now:** a second usage pipeline. Emitters that already exist must feed this ledger.

**Why this slot is now:** Stripe does not know our token and minute meters. If we start from the invoice, we cannot explain a bill.

---

### Day 51 — LEARN and small build: ledger first, Stripe second

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** the ledger is strongly consistent. The dashboard may lag. The quota counter must not drift forever.

#### 1. Topics to learn before code

1. A usage ledger row is an append of a meter event: who, which agent, which model, how many tokens or seconds, and the idempotency key from the source event.
2. Ledger writes are strongly consistent. A successful model call that we billed must be readable from the primary immediately after the write commits.
3. Dashboard rollups may be eventual. A chart can lag. A quota decision should not read a stale chart.
4. Quota checks use Redis counters fed from the ledger. If Redis is flushed, the counter is rebuilt from the ledger or the call fails closed. Write which one in the ADR. Failing closed is the safer default.
5. Stripe, or a stub, collects money later. It is not the source of truth for tokens and voice minutes.
6. Double delivery of `usage.recorded` must not double-append. The source event id is unique in the ledger.
7. Overage is a comparison of the ledger sum (or the Redis counter) against the plan. It is not a guess from logs.

#### 2. Scale

Meter events follow model calls and call minutes, which is high volume relative to invoices. The hot path is append plus a Redis increment, not a `SUM(*)` over the month on every request. A monthly invoice job may scan. A live quota check must not. At 10,000 organizations, one global counter key is a hot key. Key the counter by organization id.

#### 3. Scenarios

- The model call succeeds and the usage consumer crashes before append. Redelivery appends once.
- Redis is flushed. The next quota check rebuilds or fails closed, as the ADR says. It does not allow unlimited usage.
- Two replicas increment. Redis is the shared counter. An in-process counter would under-count the cap.
- A tenant looks at another tenant's invoice id. The read is scoped.

#### 4. Junior approach vs senior approach

A junior approach treats the Stripe dashboard as the meter, or sums logs at the end of the month.

A senior approach appends a ledger, deduplicates by event id, and checks quotas through Redis counters rebuilt from that ledger.

A staff approach does not require a live Stripe account to finish the slot. A stub collector is allowed. The ledger is not optional.

#### 5. Decision we already made

We own the usage ledger and the billing view. Stripe or a stub collects later. Ledger writes are strongly consistent. Dashboard rollups may be eventual. Quota checks use Redis counters fed from the ledger.

#### 6. Small day-1 build

Aqib writes `docs/adr/0026-usage-billing.md` and maps each existing emitter to a meter. Hashir writes one example invoice line (tokens, voice minutes) from a fixture ledger row. Hashir does not edit the ledger transaction.

#### 7. Talk split

Aqib prepares the unique event id and the Redis rebuild or fail-closed rule. Hashir prepares why the chart may lag while the quota must not.

#### Day notes

- Date:
- Result:
- Need for Day 52:

---

### Day 52 — BUILD and talk: Usage and billing service

**Status:** `not_started` · **Hours:** 6

**Deep focus:** an idempotent ledger append and a quota check that uses the shared counter.

#### Aqib (owns `services/usage`)

- [ ] Append meters from existing usage events.
- [ ] Plan, quota, and a Redis counter.
- [ ] Invoice model. Collection may be a stub.

#### Hashir (owns tests)

- [ ] Test: duplicate event id does not double the total.
- [ ] Test: another tenant cannot read the invoice.
- [ ] Do not call a live payment provider.

#### Talk delivery

Show one duplicate suppression and one quota read. Say what is still unsafe (stub collection, no tax). Measure append latency and duplicate hits.

#### Done when

We can explain a usage total from the ledger and block or count a quota from Redis without scanning the month on the request path.

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

**What we already have:** logs and traces, which are not an audit log.

**What we add now:** an Audit Service and a security pass on the paths we already built.

**Not now:** a new product feature hidden inside "hardening."

**Why this slot is now:** grep on logs cannot answer "who changed this role" after the log volume of millions of messages per day.

---

### Day 53 — LEARN and small build: audit vs logs vs traces

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** an audit row is immutable and queryable by tenant. A log line is not.

#### 1. Topics to learn before code

1. A trace follows one request across services. A log explains a process. An audit record states that an actor did an action on a resource at a time, with `request_id`.
2. Audit rows are immutable. Updates and deletes are not part of the API.
3. The Audit Service consumes audit events. Each service does not grow its own private audit table that nobody can query across the tenant.
4. The record includes actor, tenant, action, resource, time, `request_id`, and metadata. Metadata must not contain secrets or raw prompts if those are sensitive. Say what is allowed.
5. Service-to-service auth: open cluster DNS is not enough. We use a signed internal JWT or HMAC now. mTLS on EKS can come later if time remains.
6. The threat pass covers IDOR, prompt injection, retrieval poisoning, secret leak, and cross-tenant search. Tools stay allow-listed. This slot writes the test or the note for each, and fixes only the holes that are still open.
7. Prompt injection cannot be "solved" by a filter alone. The control is the allow-list, the tenant filter, and not putting secrets in the prompt.

#### 2. Scale

Audit volume follows writes (publish, role change, secret reveal, tool config), not every token. The query is by tenant and time. An unindexed audit table becomes unusable at 10,000 organizations. The consumer must be idempotent so a replayed event does not duplicate the audit row.

#### 3. Scenarios

- A role change succeeds and the audit consumer is down. The outbox or the audit event retries. The row appears once.
- An attacker passes another tenant's resource id. The existing IDOR tests still pass. If one fails, we fix that service. We do not only write an audit row for a leak.
- A secret value appears in an audit metadata field. The test fails.
- Internal callers with no HMAC are rejected on a service that has been switched over. Document which services are switched in this slot so we do not half-migrate.

#### 4. Junior approach vs senior approach

A junior approach greps logs or stores audit rows only inside one service.

A senior approach emits audit events to one Audit Service, keeps them immutable, and authenticates service calls.

A staff approach does not claim prompt injection is closed. We record the controls and the residual risk.

#### 5. Decision we already made

An Audit Service consumes audit events. We do not treat logs as the audit system, and we do not keep audit only inside each service. Internal calls use a signed JWT or HMAC now. mTLS is optional after that.

#### 6. Small day-1 build

Aqib writes `docs/adr/0027-audit-and-security.md` and the audit event fields. Hashir writes the threat list (IDOR, prompt leak, secret leak, cross-tenant search) with the file or test that covers each, or "gap" if none exists. Hashir does not edit signing code on day 1.

#### 7. Talk split

Aqib prepares the audit record and internal HMAC. Hashir prepares the threat list and what remains unfixed.

#### Day notes

- Date:
- Result:
- Need for Day 54:

---

### Day 54 — BUILD and talk: Audit service and hardening

**Status:** `not_started` · **Hours:** 6

**Deep focus:** an immutable audit trail for privileged actions, and one internal auth check that is real.

#### Aqib (owns `services/audit` and internal auth middleware)

- [ ] Consume audit events and store immutable rows.
- [ ] Query by tenant and time.
- [ ] HMAC or internal JWT on at least the audit ingest and one other internal route.

#### Hashir (owns the threat checklist and tests)

- [ ] Test: duplicate event does not duplicate the row.
- [ ] Test: metadata redaction on a fixture that includes a secret-looking field.
- [ ] Update the threat list with pass or gap. Do not edit the HMAC implementation while Aqib is in it.

#### Talk delivery

Show one role-change or publish audit row. Say the residual prompt-injection risk. Measure ingest lag and rejected internal calls.

#### Done when

A privileged action can be queried later by tenant. Logs are not the only record. At least one internal path rejects an unsigned caller.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 28 — Observability, alerts, notifications

|        |                |
| ------ | -------------- |
| Days   | 55–56          |
| Wave   | F              |
| Status | `not_started`  |
| Read   | sections 44–46 |

**What we already have:** traces from the platform libraries, and no alert that a human will act on.

**What we add now:** the metric set, alert rules, and a Notification Service.

**Not now:** a new product domain. Dashboards that nobody would open during an incident do not count.

**Why this slot is now:** load and failure tests in Slot 30 need a signal. An alert on every log line will be ignored.

---

### Day 55 — LEARN and small build: signals we will act on

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** golden signals, plus the AI and voice metrics that actually page someone.

#### 1. Topics to learn before code

1. Golden signals are latency, traffic, errors, and saturation. We alert on those with a threshold, not on every error log.
2. AI and voice add: model failure rate, token latency, retrieval empty rate, tool failure rate, time-to-first-audio, and active calls.
3. Business metrics include queue depth, Kafka consumer lag, Redis memory, database connections, and pod restarts.
4. An alert has an owner, a threshold, and a next step in a runbook. An alert with no action trains people to ignore it.
5. Notifications go through one Notification Service (email, Slack, or webhook). Each service does not open its own SMTP connection.
6. The notification consumer retries and is idempotent so one alert does not send ten messages.
7. Traces, metrics, and logs correlate on `trace_id` and `request_id`. A dashboard that cannot jump from an alert to a trace is incomplete for this project.

#### 2. Scale

At 1,000 requests/second, a per-request log at info level can cost more than the work. We log failures and sampled successes. Metrics are aggregated. Cardinality is the trap: a label of `user_id` or `conversation_id` on a metric will explode storage. Labels stay at tenant tier, service, route, and status, not at raw user id.

#### 3. Scenarios

- Error rate crosses the threshold. One notification fires. A flap does not send a message every scrape. Use a for-duration clause.
- Kafka lag grows. The alert names the consumer group. The runbook says whether to scale the consumer or to inspect the dead letter.
- Redis memory is high. The alert fires before eviction of revocation keys, because eviction of a revocation key is a security incident.
- A test notification is retried. The receiver sees one message.

#### 4. Junior approach vs senior approach

A junior approach alerts on every log line and sends mail from inside each service.

A senior approach picks a small set of signals, sets thresholds, and sends through one notification service with retry and dedupe.

A staff approach does not build a custom metrics database. We use the collector we already run, and we add rules. We do not page on a single 500.

#### 5. Decision we already made

We alert on golden signals plus the AI, voice, and business metrics we listed, with real thresholds. We do not alert on everything. Notifications go through a Notification Service.

#### 6. Small day-1 build

Aqib writes `docs/adr/0028-observability-alerts.md` and drafts numeric thresholds for error rate, p99, database connections, queue depth, Kafka lag, Redis memory, pod restarts, LLM failure, and voice latency. Hashir writes the runbook titles those alerts will link to (one sentence each). Hashir does not edit alert rules on day 1.

#### 7. Talk split

Aqib prepares cardinality and the Redis-memory alert. Hashir prepares dedupe of notifications and which signals are not worth a page.

#### Day notes

- Date:
- Result:
- Need for Day 56:

---

### Day 56 — BUILD and talk: telemetry and notifications

**Status:** `not_started` · **Hours:** 6

**Deep focus:** one page-worthy alert and one notification path that does not duplicate.

#### Aqib (owns metrics and alert rules)

- [ ] Export the golden signals and the AI or voice metrics we can actually emit today.
- [ ] Add alert rules for the thresholds in the ADR.
- [ ] Keep label cardinality low.

#### Hashir (owns `services/notification` and the runbook stubs)

- [ ] A consumer that sends a stub email or webhook and dedupes by alert id.
- [ ] Runbook stubs under `docs/runbooks/` for the alerts Aqib defined.
- [ ] Do not edit the metric labels while Aqib is in that file.

#### Talk delivery

Fire one test alert and show one notification. Say what is still unsafe (thresholds are guesses until Slot 30's load test). Measure notification duplicates and alert flapping.

#### Done when

We can point at a small set of alerts that a person could act on, and a notification path that retries without spamming.

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

**What we already have:** a system that runs on Compose.

**What we add now:** Terraform modules, an EKS deploy, environments, a pipeline, and notes for rolling and blue/green plus rollback.

**Not now:** a rewrite of services to fit the cloud. The cloud runs what already exists.

**Why this slot is now:** the project goal includes a reproducible cluster. Clicking in a console is not reproducible.

---

### Day 57 — LEARN and small build: cloud is a destination, not a rewrite

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** what changes when a service has two pods, a load balancer, and a managed database.

#### 1. Topics to learn before code

1. Terraform describes the network, the cluster, the data services, and the deploy roles. A console click cannot be reviewed or rebuilt.
2. EKS runs the same container images Compose runs. We do not fork business logic for AWS.
3. Managed Postgres, Redis, and Kafka (or the chosen equivalents) replace the Compose hostnames via configuration. The application still speaks the same protocols.
4. Environments are local, dev, staging, and production. Non-production is smaller. Secrets differ. Schema migrations are a pipeline step, not something the app does on boot.
5. The pipeline is push, then lint, unit, integration, security scan, image, registry, deploy dev, smoke, then staging, then smoke. Production is a deliberate promotion.
6. Rolling deploy replaces pods gradually. Blue/green keeps two versions and switches traffic. Rollback is redeploying the previous image and, if the migration is backward compatible, leaving the schema. A destructive migration needs a written expand-and-contract note.
7. Health checks (`/healthz` live, `/readyz` ready) are what the kubelet and the load balancer use. A service that is "up" but cannot reach Postgres must fail readiness.
8. Two replicas break in-memory rate limits, in-memory sessions, and local disk uploads. Those bugs should already be fixed. This slot verifies them. It does not invent a new session design.

#### 2. Scale

The design target is still 1,000 requests/second and hundreds of calls. This slot does not have to pass that load. It has to make horizontal scale possible: stateless pods, a shared Redis, a shared database, and an autoscaling setting we can explain. An autoscaler on CPU will not help if the bottleneck is a database lock. Say that in the talk.

#### 3. Scenarios

- A new pod starts before migrations finish. Readiness fails. The load balancer does not send traffic.
- A deploy ships a bug. Rollback uses the previous image. We write whether the latest migration is compatible.
- A secret is in the image. The scan or the review catches it. Secrets come from the secrets mechanism, not from the git repo.
- Two pods rate-limit. The limit is in Redis or it is documented as wrong.

#### 4. Junior approach vs senior approach

A junior approach clicks resources in the console or learns Kubernetes by rewriting the app.

A senior approach maps Compose to Terraform and EKS, keeps migrations out of process start, and writes the rollback.

A staff approach does not move the system to ECS only to avoid Kubernetes, because the project goal is the cluster. ECS is a valid product choice and a weaker match to this program.

#### 5. Decision we already made

We use Terraform, EKS, a container registry, and managed data services mapped from Compose. Environments are local, dev, staging, and production.

#### 6. Small day-1 build

Aqib writes `docs/adr/0029-aws-eks.md` and a Terraform skeleton that does not need a live apply if credentials are absent (plan-only is acceptable). Hashir writes the pipeline stages as a checklist in `docs/runbooks/deploy.md`. Hashir does not edit Terraform on day 1.

#### 7. Talk split

Aqib prepares readiness, migrations, and rollback. Hashir prepares what two replicas break, using rate limit and sessions as examples.

#### Day notes

- Date:
- Result:
- Need for Day 58:

---

### Day 58 — BUILD and talk: infra as code and the pipeline

**Status:** `not_started` · **Hours:** 6

**Deep focus:** a deploy we can roll back, and a readiness check that tells the truth.

#### Aqib (owns `infra/` Terraform and the deploy manifests)

- [ ] Modules or stacks for network, cluster, and data services, mapped from Compose.
- [ ] A deployment manifest with readiness and liveness.
- [ ] Notes for rolling and blue/green, and the rollback command.

#### Hashir (owns CI config and the deploy runbook)

- [ ] Pipeline file: lint, unit, image build. Integration and deploy stages can be skipped when credentials are absent, but the file shows the stages.
- [ ] `docs/runbooks/deploy.md` includes rollback.
- [ ] Do not edit the Terraform resources while Aqib is in them.

#### Talk delivery

Explain how a bad pod is kept out of rotation, and how rollback works. Say what is still unsafe (we may not have applied this to a real account). Measure nothing in production yet. Name the metrics the autoscaler would watch.

#### Done when

A reviewer can see how the same services would run on EKS, how a migration is separate from boot, and how to roll back an image.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:

---

## Slot 30 — Load, failure, DR, SDKs, closeout

|        |                |
| ------ | -------------- |
| Days   | 59–60          |
| Wave   | F              |
| Status | `not_started`  |
| Read   | sections 55–63 |

**What we already have:** the platform's domains, alerts, and an infra shape.

**What we add now:** proof, SDK polish, runbooks, and a final check against the project demonstration list.

**Not now:** a new domain. If something is missing, go back to that slot. There is no Slot 31.

**Why this slot is now:** a system we have not broken on purpose is a system we do not understand.

---

### Day 59 — LEARN and small build: how we prove it, and how developers use it

**Status:** `not_started` · **Hours:** 6

**Deep focus for the talk:** a planned failure, a measured bottleneck, and a restore we have actually tried or honestly marked as not tried.

#### 1. Topics to learn before code

1. A load test scripts the gateway, the runtime, and conversations. It records throughput, p50, p95, p99, errors, database, Redis, queues, and Kafka lag. Clicking the widget ten times is not a load test.
2. We may not reach 1,000 requests/second on a laptop. We still name the first bottleneck and the graph that shows it.
3. A failure test breaks one dependency at a time: Postgres, Redis, a Kafka consumer, an SQS worker, the model provider, speech vendors, and a pod. For each: detect, log or alert, retry or fallback, recover, and check that tenant A did not read tenant B.
4. This is planned chaos. It is not a large chaos product.
5. Disaster recovery writes RTO and RPO. Backups cover Postgres and object storage. Kafka replay is described. Terraform recreate is described. One restore rehearsal is attempted or marked "not run" with a reason. "We have Terraform" is not a restore.
6. The TypeScript SDK covers `agent.run` or `stream`, `conversation.create` or `send`, and `knowledge.search`, with a local example. Python waits until TypeScript and the runbooks are done.
7. OpenAPI alone is not the SDK. Developers will copy HTTP wrong. The SDK is a thin, typed client over the gateway.

#### 2. Scale

The design target stays 1,000 requests/second sustained and 5,000 burst, millions of messages per day, and hundreds of calls. The proof slot reports the numbers we actually hit and the limit we hit first (CPU, database connections, model latency, or lock wait). Hiding a lower number is a failed slot.

#### 3. Scenarios

- Redis is stopped. Login revocation or quota fails in the way the ADR promised (fail closed or rebuild). The test records which one happened.
- The model provider times out. The user-visible error is our envelope. The conversation does not gain a fake successful assistant message.
- A duplicate Kafka message is injected. The consumer side effect happens once.
- A pod is deleted. Readiness removes it. A replacement serves traffic. In-memory state is not required for correctness.
- Restore is rehearsed on a scratch database, or the gap is written. We do not claim an RPO we did not test.

#### 4. Junior approach vs senior approach

A junior approach demos the happy path and calls the OpenAPI file an SDK.

A senior approach publishes load numbers, failure results, an RTO and RPO note, and a TypeScript client that works against local services.

A staff approach does not add a new domain to make the checklist look finished. Gaps stay visible in the coverage map.

#### 5. Decision we already made

Load tests are scripted. Failure tests break one dependency at a time. Disaster recovery is written and, where possible, rehearsed. The TypeScript SDK is required. Python must not delay runbooks.

#### 6. Small day-1 build

Aqib writes the load and failure plan in `docs/architecture/proof-plan.md` (which dependency, which assertion). Hashir lists the SDK methods and one example call sequence in `sdk/typescript/README.md` without finishing the client. Hashir does not edit the load harness on day 1.

#### 7. Talk split

Aqib prepares the bottleneck and the Redis or Postgres failure. Hashir prepares RTO, RPO, and what the SDK must not hide (errors, `request_id`).

#### Day notes

- Date:
- Result:
- Need for Day 60:

---

### Day 60 — BUILD and talk: prove, SDK, close the board

**Status:** `not_started` · **Hours:** 6

**Deep focus:** evidence. Do not polish the SDK if the proof work is not done.

Do this order.

1. Load test the chat and runtime path. Save results in `tests/load/`. Name the bottleneck.
2. Failure tests: Redis down, model timeout, queue worker crash, duplicate Kafka message. Save them in `tests/failure/`.
3. Disaster-recovery notes and one backup or restore, or a Terraform recreate dry-run. Fill RTO and RPO.
4. TypeScript SDK and the example README.
5. Runbooks, the final checklist, the coverage map, and the talk.

#### Aqib (owns `tests/load`, `tests/failure`, and the DR note)

- [ ] Load test with p50, p95, p99, error rate, and one named bottleneck.
- [ ] Failure tests for cache, LLM, queue worker, and duplicate event.
- [ ] RTO and RPO in `docs/architecture/disaster-recovery.md`.

#### Hashir (owns runbooks and `sdk/typescript`)

- [ ] Runbooks: database failure, Redis outage, Kafka lag, queue backlog, LLM outage, voice provider outage, deploy rollback, high CPU, high p99.
- [ ] TypeScript SDK and a local example. Python only if the TypeScript SDK and the runbooks are done.
- [ ] Walk the coverage map. Mark `done` or `gap` with the slot that owns the gap.
- [ ] Do not edit the load scripts while Aqib is running them.

#### Talk delivery

Present the bottleneck, one failure test, the RPO we can defend, and one SDK call. Say the gaps out loud. A hidden gap fails the talk.

#### Done when

We can show a platform: multi-tenant agents on chat and voice, knowledge, tools, inbox, events, workflows, campaigns, leads, evaluation, usage, audit, observability, infra-as-code, and failure behavior. Gaps are written. Gaps are not hidden.

Set the progress board to 60/60 only if the "Done when" lines across slots are honest.

#### Day notes

- Date:
- Shipped:
- Not shipped:
- Blocked by:
- Gaps after day 60 (if any):

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
## YYYY-MM-DD — Day N (learn+spike | build+talk) — Slot NN
Hours worked:
Person: Aqib | Hashir
Status: done | slipped | blocked
Shipped:
Did not ship:
Blocker:
ADR/LLD path:
Talk delivered: yes | no
What is still unsafe at 1,000 requests/second:
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
