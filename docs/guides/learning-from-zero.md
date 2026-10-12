# Learning QuickStart AI from zero — Roadmap deep guide

This document is **Module 1** of a learn-from-scratch path. It explains [docs/roadmap.md](../roadmap.md) in full depth so you can navigate the repo, the feature order, and the scale rules before you touch code.


| If you want…                                                    | Read this                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Product vision (channels, business features, long architecture) | [docs/project_details.md](../project_details.md)                                                           |
| Feature status, build order, per-feature specs                  | [docs/roadmap.md](../roadmap.md)                                                                           |
| Learn-day exercises, DDL sketches, failure matrices             | [docs/ai-roadmap.md](../ai-roadmap.md)                                                                     |
| Why a design was chosen                                         | [docs/adr/](../adr/)                                                                                       |
| Local setup                                                     | [README.md](../../README.md), [docs/architecture/local-data-plane.md](../architecture/local-data-plane.md) |


**How to use this guide:** Read one module per sitting. Write answers to the checkpoints in a notebook (paper is fine). On each feature you build, return to [roadmap §1](../roadmap.md#1-how-to-read-this-file) and walk headings 1–11 before you ship.

---



## Module 0 — What you are learning

QuickStart AI is a **multi-tenant B2B platform** where a company (organization) creates **workspaces**, configures **agents**, publishes **versions**, and runs **conversations** over chat (today) and voice (planned). One **runtime** executes turns: load published config, read conversation history, optionally retrieve knowledge and memory, call the **model gateway** for the LLM, run **tools**, write messages back.

The repo is intentionally a **production engineering** project, not a single Next.js demo. You will see many **microservices**, shared **packages/contracts**, Postgres per domain, Redis for cache and rate limits, OpenSearch for knowledge chunks, queues for ingest, and a public **gateway** on port **3000** as the only front door for HTTP clients.

Your job as a learner is to understand **three layers at once**:

1. **Product** — what a customer does (agent, chat, later phone campaigns).
2. **Architecture** — which service owns which data and which HTTP hop happens on each turn.
3. **Scale contract** — numbers in the roadmap that decide whether a design is acceptable.

---



## Module 1 — Design scale (memorize the three budgets)

From roadmap opening and [project_details.md](../project_details.md). These are **targets**, not laptop traffic.


| Target               | Number                                                      |
| -------------------- | ----------------------------------------------------------- |
| Organizations        | 10,000+                                                     |
| Users                | 50,000+                                                     |
| Agents               | 100,000+                                                    |
| HTTP through gateway | **10,000 req/s sustained**, 20,000 peak                     |
| Messages             | Millions per day                                            |
| Concurrent chats     | 10,000+                                                     |
| Concurrent voice     | **5,000 inbound + 5,000 outbound** (separate voice process) |




### The three budgets (do not mix them)


| Budget           | What it measures                                          | What it is **not**                                                                      |
| ---------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Gateway HTTP     | Short requests: JWT, proxy, Redis rate limit, cheap reads | **Not** 10,000 LLM completions per second                                               |
| Concurrent chats | Open threads reading/writing Postgres                     | **Not** 10,000 long-lived sockets on the gateway unless you add streaming/widget design |
| Concurrent voice | Long-lived audio on **voice-service :3008**               | **Not** HTTP on port 3000; media does not live in the gateway                           |


**Extra insight:** If someone says “we need 10k RPS,” ask **which budget**. A voice turn and a health check are not the same cost or connection type.

### Rules that stay true at this scale

1. **One Postgres** (shared cluster) with `workspace_id` **on every tenant row** — not 10,000 databases (connection and migration collapse).
2. **Gateway stays thin** — valid token, route, rate limit; **no** membership DB on every hop (services enforce tenancy), **no** model calls, **no** audio.
3. **Billing off the hot path** — usage facts async (Feature 26); never block a call on ledger write.
4. **No “scale service”** — you add cache, pooler, separate voice process; you do not invent a new product feature whose only job is scale.
5. **Membership cache (09B)** before treating hot paths as honest at 10k HTTP — runtime and voice must not HTTP to workspace every turn/utterance.

**Checkpoint:** In your own words, explain why 5,000 inbound voice calls cannot be implemented as extra routes on `gateway-service`.

---



## Module 2 — How to read `roadmap.md` (file map)

The roadmap is both **plan** and **progress board**. Update it when you ship.


| Section                      | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| **Opening (scale + rules)**  | Numbers and invariants for every design review                   |
| **§1 How to read this file** | The **19 headings** every feature block uses                     |
| **§2 Words we use**          | Glossary (tenant = workspace id, etc.)                           |
| **§3 How two people work**   | Directory ownership, no two editors on same service/day          |
| **§4 What is already built** | Table of done features + **what is still unsafe**                |
| **§5 Product path**          | **5A** dependency tree, **5B** current focus, **5C** voice track |
| **§6 Progress board**        | Status table (features 01–30, P1–P8 labs, F1–F13 frontend)       |
| **§7 Learning block**        | Daily note headings (learn ~2h, ship ~4h)                        |
| **§8 + 8A**                  | Production deep topics + Docker/Kubernetes labs                  |
| **§9+**                      | Per-feature long specs (one section per feature number)          |


**Important:** Per-feature detail in the roadmap is huge. For **learn days**, pair each feature with [ai-roadmap.md](../ai-roadmap.md) **Deep learning** (heading 11).

### The 19 headings (every feature)

Walk these **before** “Build today” on learn days:

1. Pre-context
2. What this is
3. Why now
4. Junior shortcut (+ the incident it causes)
5. Production shape (Postgres vs Redis vs memory)
6. What breaks at scale
7. Choice (take / reject / cost)
8. Cloud later
9. Low-level design (tables, APIs, if X fails then Y)
10. Learn today (checklist)
11. **Deep learning** (mandatory — exercises in ai-roadmap)
12. Build today
13. Done when
14. Still unsafe
15. Database design
16. Identity and trust boundaries
17. Related features
18. API, gateway, permissions
19. Extended detail (ai-roadmap)

**Checkpoint:** Pick Feature 12 (runtime) in roadmap and find headings 1–5 without scrolling to “Build today.”

---



## Module 3 — Vocabulary (extended glossary)

> Core terms from roadmap §2, with learner notes.


| Term                     | Meaning                                                        | Common mistake                                |
| ------------------------ | -------------------------------------------------------------- | --------------------------------------------- |
| **Organization**         | Company account; billing and users                             | Confusing with workspace                      |
| **Workspace**            | Tenant project; agents, chats, knowledge                       | Forgetting `workspace_id` in SQL              |
| **Gateway**              | Public HTTP `:3000`; JWT + proxy                               | Putting business logic or LLM here            |
| **Agent**                | Config (instructions, model, tools) — **not** the running loop | Editing published version in place            |
| **Version**              | Immutable snapshot at publish                                  | Runtime reading draft row                     |
| **Conversation**         | Ordered messages in Postgres                                   | Missing idempotency on append                 |
| **Model gateway**        | Only place that talks to LLM vendors                           | Calling OpenAI from random service            |
| **Runtime**              | Turn loop: version + conversation + model + tools              | Confusing with “agent” config service         |
| **Web fetch**            | Scrape/crawl/search service; vendors are providers             | Calling Olostep from ingest directly          |
| **Voice service**        | `:3008` realtime; STT/TTS; calls runtime                       | Running agent loop inside voice               |
| **Voice turn**           | STT → runtime → TTS (cascade default)                          | Same timeout as chat                          |
| **Idempotency key**      | Client retry must not duplicate rows                           | Trusting network without keys                 |
| **09B membership cache** | Redis roles; workspace invalidates                             | Hitting workspace HTTP every request at scale |


**Actors (trust boundaries):**

- **Staff actor** — logged-in user with workspace role (`actorId`).  
- **End-user subject** — widget visitor, caller (`subject_key` for memory).  
- **Internal service** — `MEMORY_INTERNAL_TOKEN`, service-to-service routes.

**Checkpoint:** Draw a box labeled “tenant” and write what ID column appears in agent, conversation, and knowledge tables.

---



## Module 4 — What is already built (repo map)

Synced with roadmap **§6** progress board (as of board note in roadmap). Use §4 table for “where it lives”; status may lag — **§6 wins**.

### Service ports (local)


| Port | Service                                        |
| ---- | ---------------------------------------------- |
| 3000 | gateway-service (public)                       |
| 3001 | identity-service                               |
| 3002 | workspace-service                              |
| 3003 | agent-service                                  |
| 3004 | conversation-service                           |
| 3005 | model-gateway                                  |
| 3006 | runtime-service                                |
| 3007 | web-fetch-service                              |
| 3008 | voice-service (planned / not product-complete) |
| 3009 | knowledge-service                              |
| 3010 | memory-service                                 |
| 5433 | Postgres (host mapped from compose)            |




### Features done (product core)


| #     | Capability                     | You should be able to trace…                  |
| ----- | ------------------------------ | --------------------------------------------- |
| 01–03 | Monorepo, data plane, packages | `pnpm check`, `make up`, `packages/contracts` |
| 04    | Identity                       | Register/login, JWT, orgs                     |
| 05    | Workspace RBAC                 | Permissions in contracts                      |
| 06    | Gateway                        | Proxy to services, rate limit                 |
| 07–08 | Agent drafts + publish         | Production pointer vs draft                   |
| 09    | Conversations                  | Messages, idempotency                         |
| 09B   | Membership cache               | `packages/workspace-access`                   |
| 10    | Model gateway                  | Complete/stream internal API                  |
| 10B   | Web fetch                      | Acquisition units, providers                  |
| 11    | Knowledge ingest               | SQS worker → OpenSearch                       |
| 12    | Runtime chat turns             | Gateway → runtime → model                     |
| 13    | RAG in runtime                 | Retrieve chunks on turn                       |
| 14    | Memory                         | Facts per subject, runtime inject             |
| 15    | Tools & MCP                    | Tool loop, tool_calls store                   |




### Current focus (roadmap §6)

- **Next:** Feature **16** secrets (parallel partner was 15).  
- **Voice:** §**5C** — not current build order unless reprioritized.  
- **Frontend:** F1–F13 in `apps/web/` later — no F-slot edits service dirs.



### Shared packages (learn early)

- `packages/contracts` — permissions, API shapes, tool definitions.  
- `packages/errors`, `logging`, `tracing`, `auth`, `http-server` — platform shell.  
- `packages/workspace-access` — membership cache.

**Checkpoint:** Run `make up`, then list which containers exist. Match each to a feature number.

---



## Module 5 — One chat turn (end-to-end story)

This is the spine of the product. Voice reuses the same **runtime** later; only the edge changes.

```text
Client (curl / future widget)
  → HTTPS :3000 gateway-service
       JWT valid, rate limit, x-request-id
       proxy /v1/workspaces/:workspaceId/...
  → runtime-service :3006 (or proxied path)
       Resolve workspace membership (cache 09B)
       Load agent production version (agent-service data)
       Load conversation messages (conversation-service)
       Optional: knowledge retrieve (knowledge-service / OpenSearch)
       Optional: memory facts (memory-service)
       Optional: tool loop (model-gateway tools + executors)
       model-gateway :3005 → vendor LLM
       Append assistant message (conversation) with idempotency
  → Response to client
```

**Extra important details:**

- Gateway **does not** prove URL `workspaceId` matches membership; **runtime** (and other services) must enforce RBAC.  
- Runtime must read **published** version, not draft.  
- Model keys and tool secrets eventually go through **Feature 16**, not env scattered everywhere.  
- RAG is **not** memory: knowledge = documents; memory = small per-subject facts.

**Checkpoint:** Without opening code, write the order of service calls for a turn **with** RAG and **with** one HTTP tool.

---



## Module 6 — Product path (5A, 5B, 5C)



### 5A — Dependency order (big picture)

```text
Foundation (01–07)     → identity, workspace, gateway, agent drafts
Agents & chat (08–12)  → versions, conversations, model gateway, runtime
Scale + knowledge      → 09B, 11, 13, 14
Agent surface          → 15 tools, 16 secrets, 17 widget, 18 inbox
Events & growth        → 19–20 workflows, 24 leads
Voice (5C)             → 21 → 21B → 22 → 21C → 23 campaigns
Billing & ops (late)   → 25–30, audit, cloud deploy
Platform labs P1–P8   → Docker, k8s two gateways, probes (parallel)
Frontend F1–F13       → apps/web only
```



### 5B — Knowledge-first path (historical focus)

09B → 11 → 13 → 14 — largely **done** in codebase; board moved to **16 secrets**.

### 5C — Voice track (when scheduled)

Prerequisites called out in roadmap:

- 09B membership cache **before** voice at scale.  
- **21** voice path on :3008 (sessions, fake media, calls table).  
- **21B** STT/TTS adapters inside voice-service.  
- **22** reliability (caps, barge-in, reconnect).  
- **21C** telephony (Twilio/Telnyx).  
- **18** handoff before heavy outbound.  
- **23** campaigns.  
- Default audio: **cascade** (STT → runtime → TTS); optional S2S profile only when tools/RAG off (ADR when built).

**Rules that do not change:**

1. Runtime is extended, not replaced.
2. Voice is another **channel** into runtime.
3. Kafka events **after** Postgres commit.
4. Telephony/STT/TTS SDKs stay in **voice-service**, not gateway/runtime.

**Checkpoint:** Why must handoff (18) matter before large outbound campaigns (23)?

---



## Module 7 — What is “still unsafe” (intentional gaps)

From roadmap §4 — not forgotten bugs; **next designs**.


| Gap                                                       | Why it matters                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Gateway validates JWT but not workspace membership in URL | Enforced in data services — understand before “security audit” panic |
| Per-request workspace HTTP without cache                  | Bottleneck at 10k req/s; 09B exists — know cache invalidation        |
| In-process `Map` rate limits                              | Breaks with second gateway replica — use Redis                       |
| Voice on gateway                                          | Wrong connection model for 5k+5k calls                               |


When you learn a feature, read **“Still unsafe”** (heading 14) for that feature too.

---



## Module 8 — Daily learning method (§7 + §8)



### Six-hour day split

- ~2 hours: notes under §7 headings (or feature headings 1–11).  
- ~4 hours: ship code/tests/docs per **Build today**.



### Production deep topics (§8 index)

Study these **on the feature that needs them**, not in random order:


| Topic                       | Shows up in                   |
| --------------------------- | ----------------------------- |
| Transactions / lost updates | Agent publish, roles          |
| Idempotency                 | Messages, tools, billing      |
| Timeouts / circuit breaker  | Model gateway, web fetch      |
| Tenant leaks                | Every new table               |
| Queues / backpressure       | Knowledge ingest, campaigns   |
| Streaming / proxies         | Widget, runtime stream, voice |
| Secrets / rotation          | Feature 16                    |
| Voice stage latency         | 21+, V1 lab                   |


Full narrative: roadmap **§8A** (Docker/K8s labs P1–P8).

**Extra:** “Explain back” after each lab — what breaks with **two copies** of the process?

---



## Module 9 — Two-person workflow (§3)

Rules that prevent merge pain:

- One **feature** per person per day; different **service directories**.  
- One person per **shared package** per day.  
- Gateway: separate `proxy-*.routes.ts` files; avoid both editing `routes/index.ts`.  
- Do not start a feature whose **Needs** row is still open on the board.

You are learning solo — still obey **directory boundaries** mentally when you practice features.

---



## Module 10 — Related documents (reading order)

**Week 1 — orientation (this guide +):**

1. [roadmap.md](../roadmap.md) §1–§6 (this guide modules 1–7).
2. [project_details.md](../project_details.md) — skim sections 1–3 (product), 4–7 (scale).
3. [architecture/organization-vs-workspace.md](../architecture/organization-vs-workspace.md).
4. [architecture/http-layers.md](../architecture/http-layers.md).
5. ADRs **0001, 0005, 0006, 0009, 0010** (monorepo, tenancy, gateway, versions, model gateway).

**Week 2 — shipped features (trace code):**

1. Feature 08–09: ADR 0008, conversation idempotency.
2. Feature 12: runtime README + gateway proxy routes.
3. Feature 11 + 13: knowledge ingest guide, RAG path.
4. Feature 14–15: [api/memory.md](../api/memory.md), [api/tools.md](../api/tools.md), ADR 0014–0015.

**When building Feature 16:**

- Roadmap feature block + ai-roadmap + new ADR 0016 when it lands.

**API practice:**

- [docs/api/README.md](../api/README.md), Bruno collections under `docs/bruno/`.

---



## Module 11 — Self-assessment (answer without looking)

1. What is the difference between organization and workspace?
2. Name the three scale budgets and one thing each is **not**.
3. Which port is public HTTP? Which is voice?
4. Why is there a model-gateway instead of calling OpenAI from runtime?
5. What is the difference between knowledge RAG and memory facts?
6. What does idempotency protect on message append?
7. List five features that are **done** and one that is **current focus**.
8. What is the default voice pipeline (cascade vs S2S)?
9. Why is membership cache required before 10k HTTP?
10. Where do tool credentials belong after Feature 16?

---



## Module 12 — What this guide does **not** cover (next modules)

Create or follow these as you progress:


| Next module  | Content                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| **Slot 01**  | [learning-slot-01-engineering-foundation.md](./learning-slot-01-engineering-foundation.md) — monorepo + `_template` |
| **Identity** | [learning-identity-service.md](./learning-identity-service.md) — gateway proxy, tokens, Redis, production |
| **Gateway**  | [learning-gateway-service.md](./learning-gateway-service.md) — lifecycle, rate limits, SPOF, resilience |
| **One request** | [learning-request-lifecycle.md](./learning-request-lifecycle.md) — chat turn from client to model and back |
| **Module 2** | [project_details.md](../project_details.md) — product channels, inbox, campaigns, compliance |
| **Module 3** | Local data plane + migrations (`make up`, per-service migrate) — roadmap Slot 02             |
| **Module 4** | Identity + workspace + gateway trace with curl                                               |
| **Module 5** | Agent publish + conversation + runtime turn (hands-on)                                       |
| **Module 6** | Knowledge, memory, tools loops                                                               |
| **Module 7** | Voice §5C architecture (read-only until Feature 21)                                          |
| **Module 8** | Deploy/ops (Compose, Contabo, managed DB — operational, not roadmap slot)                    |


Ask to generate **Module 2** when you finish checkpoints in Modules 0–11.

---



## Module 13 — Extra considerations (staff-engineer lens)

1. **Laptop ≠ production** — Compose runs Kafka + OpenSearch on one machine; cloud will split or trim.
2. **Design target ≠ current capacity** — Marketing scale numbers are architecture goals; one VPS does not satisfy them.
3. **Fail closed on writes** — When cache or dependency is ambiguous, prefer rejecting a write over cross-tenant data.
4. **Contracts first** — Change `packages/contracts` before two services invent two JSON shapes.
5. **Tests are proof** — Tenant isolation tests, idempotency replay, tool-call upsert — roadmap “Done when” is testable.
6. **ADR before debate** — If you disagree with a choice, write an ADR fragment, not a long Slack thread.
7. **Frontend (F-slots)** consumes gateway `:3000` only — never bypasses tenancy rules.
8. **Hybrid voice** (cascade + S2S) is a product/engineering trade-off documented when voice ships — runtime stays shared.

---



## Quick reference card (print or pin)

```text
Tenant ID     = workspace_id (every customer row)
Public door   = gateway :3000
Turn brain    = runtime :3006
LLM door      = model-gateway :3005
Voice edge    = voice :3008 (later)
Learn order   = roadmap headings 1–11 → ai-roadmap Deep learning → build
Scale ask     = which budget? (HTTP / chats / voice)
Current build = Feature 16 secrets (check §6 board)
```

---

*Last aligned with roadmap progress board: Feature 15 done, focus 16. Re-read roadmap §6 when status changes.*