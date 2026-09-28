# QuickStart AI — Roadmap

This file is the plan and the progress board.

- What the product is: [docs/project_details.md](./project_details.md)
- When and how we build it: this file
- Why we chose a design: [docs/adr/](./adr/)

Update this file at the end of every work day. Change the status, tick the boxes, and write what shipped.

Design scale (use these numbers when you ask "will this break?"):

- 10,000+ organizations, 50,000+ users, 100,000+ agents
- 10,000 API requests per second sustained, 20,000 peak
- Millions of messages per day, 10,000+ concurrent chats
- 5,000 concurrent ongoing inbound voice calls and 5,000 concurrent ongoing outbound voice calls

These numbers are the design target. They are not the traffic on a laptop. A design that only works on one process for one user is not done.

These are three different budgets. Do not mix them.

| Budget | What it is | What it is not |
| --- | --- | --- |
| 10,000 HTTP requests per second sustained, 20,000 peak | Short requests through the gateway: JWT, proxy, Redis rate limit, cheap reads | Not 10,000 model calls per second |
| 10,000+ concurrent chats | Open conversations that read and append in Postgres | Not 10,000 long-held gateway sockets unless the widget is streaming |
| 5,000 inbound voice calls and 5,000 outbound voice calls at the same time | Up to 10,000 long-lived audio sockets on the **voice** process | Not HTTP on the API gateway. Media and call drain do not sit on port 3000 |

Rules that stay true at this target:

1. One shared Postgres schema with `workspace_id` on every tenant row. Ten thousand databases would fail on connections and migrations first.
2. The HTTP gateway stays a thin door. It does not check membership on every hop by calling workspace, it does not call a model, and it does not hold audio.
3. Billing is never on the request or call path. Model tokens, web acquisition units, and call minutes become usage facts, then a consumer writes the ledger (Feature 26).
4. We do not add a service whose only job is "scale." Cache, pooler, and a separate voice process are the improvements. The feature list stays the same.

What must exist before we treat the target as honest:

- A short Redis cache of workspace membership. Postgres stays the source of truth. Per-request HTTP to workspace at 10,000 requests per second is the bottleneck we already have.
- A written Postgres connection budget, then a pooler (PgBouncer or the Aurora/RDS proxy) before the production load test if replica math exceeds `max_connections`.
- Voice as its own process, with a longer drain than HTTP, and a Redis cap of 5,000 inbound and 5,000 outbound.
- A global and per-workspace cap on outbound model calls so one tenant cannot fill every vendor connection while calls are up.
- Web fetch (Feature 10B) with provider adapters, per-workspace acquisition unit budgets, and usage facts for crawl/scrape/search — not vendor SDKs scattered in ingest or tools.
- **Membership cache (Feature 09B)** before voice or runtime at scale. Voice and runtime must not HTTP to workspace on every turn or utterance.
- **Voice service** as its own process (port **3008**), Redis caps **5,000 inbound + 5,000 outbound**, and **P3-style graceful drain** before production telephony traffic.

---

## 1. How to read this file

Each feature has the same shape. Read it in this order.

1. **Pre-context.** What already exists, and the words we will use.
2. **What this is.** A plain definition.
3. **Why now.** What breaks later if we skip it.
4. **Junior shortcut.** The usual first implementation, and the production failure it hides.
5. **Production shape.** How the same feature looks when many copies of the service are running.
6. **What breaks at our scale.** The specific failure, not a slogan.
7. **Choice.** The option we take, the options we reject, and the cost of the option we take.
8. **Cloud later.** What stays the same when we move from Docker Compose to a cloud cluster. Kubernetes and cloud accounts are built near the end. Earlier features must already be safe with two copies of the process.
9. **Low-level design.** Tables, APIs, files, and the failure policy ("if X fails, we do Y").
10. **Learn today.** The study block. Do this before code.
11. **Build today.** Two tracks. Each track is a full feature, not a helper task.
12. **Done when.** The checks that must be true.
13. **Still unsafe.** What we knowingly leave for a later feature.

Every work day has two parts: **learn, then ship**. The learning block uses the headings above. The build block must leave running code or a finished doc/test/script that another person can run.

Every second work day also has a **production deep topic**. That topic is not a side lecture. It is the failure mode of the feature you are shipping that day (locks, scaling, timeouts, traces, and so on).

---

## 2. Words we use

| Word | Meaning in this project |
| --- | --- |
| Organization | The company account. Billing and users live here. |
| Workspace | The project inside an organization. Agents, chats, and knowledge live here. This is the tenant id. |
| Tenant | In our code, tenant means workspace id. Every row that belongs to a customer has `workspace_id`. |
| Gateway | The only public HTTP door (local port 3000). It checks the login token and forwards the call. |
| Agent | Saved configuration: name, instructions, model settings. It is not the running chat loop. |
| Version | A frozen copy of an agent at publish time. We do not edit that copy. |
| Conversation | A stored chat: ordered messages in Postgres. |
| Model gateway | Our service that calls an LLM vendor. The rest of the system does not call the vendor SDK directly. |
| Web fetch | `services/web-fetch-service` — scrape, crawl, and search. Vendors such as Olostep are **providers** behind it, not the service name. |
| Acquisition action | One billable unit of work: e.g. one scrape, one crawl page, one search query. Recorded for cost policy and Feature 26. |
| Runtime | The loop that reads a published agent, reads the chat, calls the model gateway, and writes the reply. |
| Voice service | Realtime edge on port 3008: session orchestration, STT/TTS, telephony adapter. It does **not** run the agent loop; it calls the runtime for turns. |
| Telephony provider | CPaaS that terminates PSTN/SIP (Twilio or Telnyx first) and streams media to the voice service. Not the HTTP API gateway. |
| Voice turn | One user utterance through STT → runtime → TTS (cascade default). Shorter deadline than chat; spoken fallback on timeout. |
| Idempotency key | A client-supplied id so a retry does not insert the same message twice. |
| Optimistic concurrency | Update only if `version` still matches what the client last read. If not, return 409. |
| Horizontal scale | Add more copies of the same service. |
| Vertical scale | Give one copy more CPU or RAM. It does not fix a bug that lives in process memory. |

---

## 3. How two people work

Two people work in this repo. The goal is that both can ship a **full feature** on the same day without waiting.

Rules:

1. Pick **one feature** from the current pair in the progress board. The other person picks the other feature.
2. A feature includes its own service (or its own clearly named route file), its tests, its failure behavior, and a short doc a teammate can run.
3. Do not edit the same service directory on the same day.
4. Do not edit the same shared package (`packages/*`) on the same day. If both features need a shared type, one person lands that package change first. The other person uses it the next day.
5. Gateway route files stay split by feature (`proxy-agent`, `proxy-conversation`, and so on). Do not both edit `routes/index.ts` at the same time. Add your route module in your file, then one person wires the one-line register.
6. Docs and tests are part of the feature, not a second-class task. If you own the feature, you own the happy path, the failure test, and the example.
7. A 15-minute sync is only for the JSON shape and the URL. After that, work alone.
8. Do not start a feature whose "Needs" line is still open.

We do not write owner names on tasks. Either person can take either track. The split is by **directory**, not by seniority.

---

## 4. What is already built

The old board in this file was behind the code. This table matches the repo as of the runtime-service work.

| Feature | Status | Where it lives | What a caller can do |
| --- | --- | --- | --- |
| Monorepo, service template, shared libraries | Done | `packages/*`, `services/_template` | Errors, logs, traces, auth context, HTTP shell |
| Local data plane | Done | `docker-compose.yml`, `make up` | Postgres, Valkey, Kafka, OpenSearch, OTel, local SQS |
| Identity | Done | `services/identity-service` | Register, login, refresh, orgs, API keys |
| Workspace and roles | Done | `services/workspace-service` | Workspaces, members, invites, permission checks |
| API gateway | Done | `services/gateway-service` | Public door on port 3000, JWT, Redis rate limit, proxy |
| Agent configuration | Done | `services/agent-service` | Create, list, get, update, delete agents in a workspace |
| Agent versions and publish (08) | Done | `services/agent-service` | Publish immutable versions, production pointer, rollback |
| Conversations (09) | Done | `services/conversation-service` | Threads, ordered messages, idempotent append |
| Model gateway (10) | Done | `services/model-gateway` | Internal complete/stream; vendor adapters behind one API |
| Web fetch (10B) | Done | `services/web-fetch-service` | Internal scrape, crawl jobs, search; direct HTTP + Olostep providers |
| Membership cache (09B) | Done | `packages/workspace-access` | Redis-backed role resolution; workspace invalidates on member change |
| Knowledge ingest (11) | Done | `services/knowledge-service` | Text sources → SQS worker → OpenSearch chunks |
| Agent runtime — chat turns (12) | Done | `services/runtime-service` | Turn via gateway: published version → model gateway → messages |
| Retrieval in runtime (13) | Done | runtime + knowledge internal API | RAG when workspace has ready sources; chunk ids on assistant metadata |

Shared permission strings live in `packages/contracts` so workspace and agent do not copy two different role lists.

Local ports: identity 3001, workspace 3002, agent 3003, conversation 3004, model-gateway 3005, runtime 3006, web-fetch 3007, voice 3008, knowledge 3009, gateway 3000. Postgres on the host is 5433.

### What is still unsafe in the code we already shipped

Say these out loud. They are not bugs we forgot. They are the next designs.

- The gateway checks that the token is valid. It does **not** check that this user is a member of the workspace id in the URL. Membership is checked in the service that owns the data.
- Agent and conversation permission checks call workspace over HTTP on every request. At 10,000 requests per second that hop is the bottleneck. A short Redis cache of membership is **required before we treat the gateway as ready for this scale**. Postgres stays the source of truth. A cache miss or Redis down falls back to workspace HTTP or fails closed on the write path — pick one in the ADR and test it.
- Agent drafts and immutable published versions exist (Feature 08). Runtime (Feature 12) must read the production pointer, not the draft row.
- Two gateway copies are safe for rate limits only because the counter is in Redis. Any new limit that uses a `Map` inside Node will be wrong as soon as the second copy starts.
- Voice sockets must not share the HTTP gateway process. 5,000 inbound plus 5,000 outbound is a connection and memory problem on the voice edge, not more `proxy-*.routes.ts` files.

---

## 5. Product path

Read this once. Later features assume it. **Section 5A** is dependency order. **Section 5B** is what we build next. **Section 5C** is the voice stack when we schedule telephony.

### 5A. Dependency order (where each feature belongs)

```text
Foundation (done):
  01–07  monorepo, data plane, shared libs, identity, workspace, gateway, agent drafts

Agents and chat core (done):
  08  versions & publish          ‖  09  conversations
  10  model gateway
  10B web fetch
  12  agent runtime (chat turns)

Scale + knowledge (next — see 5B):
  09B membership cache (Redis; all hot paths, not voice-only)
  11  knowledge ingest (sources → chunks → index)
  13  retrieval in runtime (embed + query; needs 11 + 12)
  14  memory (needs 09 + 12)

More agent surface:
  15  tools & MCP  ‖  16  secrets
  17  website widget  ‖  18  inbox / human handoff

Events and growth:
  19  event platform  →  20  workflows
  24  leads

Voice edge (later — see 5C; uses same runtime as chat):
  21  voice path  →  21B  speech (STT/TTS)  →  22  reliability  →  21C  telephony
  23  campaigns (needs 21C + 22; 18 before heavy outbound)
  V1  voice load & drain proof  ‖  P3  graceful drain on voice pods

Billing, security, ops (late):
  25  evaluation  ‖  26  usage & billing  →  27  audit  →  28  observability & alerts
  29  cloud deploy  →  30  load, failure, recovery, SDKs
  P1–P8  platform labs (parallel with product when files do not overlap)
```

### 5B. Current focus path (knowledge-first)

Ship in this order unless we explicitly reprioritize voice:

```text
09B membership cache
  → 11 knowledge ingest
  → 13 retrieval in the runtime (embedding + search on each turn)
  → 14 memory (when widget or inbox needs it)
```

Feature **10B** is already done; ingest (11) should call web-fetch for URL/crawl sources. Feature **12** chat turns are done; retrieval (13) extends the same runtime loop.

### 5C. Voice track (when we start telephony)

Inbound and outbound voice remain a **design target** (5,000 + 5,000 concurrent calls). They are **not** the current build order. Start this track only after **09B** and when we choose to prioritize phone over more knowledge work.

```text
09B membership cache (required before voice or runtime at scale)
  → 12 addendum: voice-turn contract in `packages/contracts` (can ship with Feature 21)
  → 21 voice path (voice-service :3008, fake media, calls table)
  → 21B speech providers (STT/TTS adapters inside voice-service)
  → 22 voice reliability (caps, barge-in, reconnect, fail-closed)
  → 21C telephony (CPaaS: Twilio or Telnyx; ADR picks primary)
  → 18 inbox / handoff (runtime skips model when state=human) — before heavy outbound
  → 23 campaigns (queued dial; needs 21C + 22)
  → 26 usage slice (voice minutes + STT/TTS units) — do not wait for full billing UI
Parallel when voice is active: P3 drain, V1 load proof, per-call stage metrics (Feature 28)
```

Default audio path: **cascade** (STT → runtime → TTS). Optional **realtime speech** profile on the agent version only when tools/retrieval are off; document in ADR for voice (Feature 21).

Rules that do not change:

1. The runtime starts with a model call only. Later features add steps. We do not throw the runtime away.
2. Voice is another channel into the same runtime.
3. We write Kafka events only after the object exists in Postgres.
4. Daily product work uses Docker Compose. A second track (section 8A) builds Docker images, a local Kubernetes slice, probes, and deploy habits **while** product features continue. Full cloud accounts stay late. The habits must exist before that day.
5. Telephony vendor SDKs and STT/TTS vendor SDKs stay inside **voice-service** (or a speech submodule), not in gateway or runtime.

---

## 6. Progress board

Update these lines every day.

- **Current focus:** **14** memory (optional) or **15** tools; voice remains **§5C**
- **Next production deep topic:** fail-closed vs workspace fallback when Redis is empty (09B day 2); tenant leaks in search when starting 11
- **Product priority:** Multi-tenant chat + knowledge at scale; voice design target unchanged, scheduled in **§5C** after knowledge path unless reprioritized
- **Finished features:** through **13** (09B, 11, 12 chat, retrieval); voice (**21+**) and streaming still open
- **Board status:** synced to repo 2026-09-28; update this line when code and table disagree

| # | Feature | Needs | Track partner (can run the same days) | Status |
| --- | --- | --- | --- | --- |
| 01 | Engineering foundation | — | — | done |
| 02 | Local data plane | — | — | done |
| 03 | Shared libraries | — | — | done |
| 04 | Identity | — | — | done |
| 05 | Workspace and roles | — | — | done |
| 06 | API gateway | — | — | done |
| 07 | Agent drafts | workspace, gateway | — | done |
| 08 | Agent versions and publish | agent drafts | 09 | done |
| 09 | Conversation service | gateway, workspace | 08 | done |
| 09B | Membership cache | workspace | 11 | done |
| 10 | Model gateway | — | 10B, 11 | done |
| 10B | Web fetch service | workspace | 11 | done |
| 11 | Knowledge ingest | 10B, workspace, OpenSearch | 14 | done |
| 12 | Agent runtime (chat turns) | 08, 09, 10 | 11, 13 | done |
| 13 | Retrieval in the runtime | 11, 12 | 14 | done |
| 14 | Memory | 09, 12 | 13 | not_started |
| 15 | Tools and MCP | 12 | 16 | not_started |
| 16 | Secrets | — | 15 | not_started |
| 17 | Website chat widget | 12 | 18 | not_started |
| 18 | Inbox and human handoff | 09 | 17, 21C | not_started |
| 19 | Event platform | objects exist | 20 | not_started |
| 20 | Workflow automation | 19 | 19 | not_started |
| 21 | Voice path | 12, 09B | 21B | not_started |
| 21B | Speech providers (STT/TTS) | 21 | 21C | not_started |
| 22 | Voice reliability | 21 | 21C | not_started |
| 21C | Telephony (CPaaS) | 21, 21B, 22 | 23 | not_started |
| 23 | Campaigns | 21C, 22, 09 | 24 | not_started |
| V1 | Voice load and drain proof | 22, P3 | P3 | not_started |
| 24 | Leads | 19 | 23 | not_started |
| 25 | Evaluation | 12 | 26 | not_started |
| 26 | Usage and billing | 10, 12, 21B, 21C | 25 | not_started |
| 27 | Audit and security | all writes | 28 | not_started |
| 28 | Observability and alerts | traces exist | 27 | not_started |
| 29 | Cloud deploy (AWS, Kubernetes, CI) | features above | 30 | not_started |
| 30 | Load, failure, recovery, SDKs | 29 | 29 | not_started |
| P1 | Docker images for our services | services exist | P2 | not_started |
| P2 | Local Kubernetes: two gateway copies | P1 | P1 | not_started |
| P3 | Probes, graceful shutdown, rolling update | P2 | P4 | not_started |
| P4 | Config, secrets, and "no secrets in the image" | P1 | P3 | not_started |
| P5 | Postgres pool, timeouts, and slow-query guard | identity or workspace | P6 | not_started |
| P6 | Metrics that survive two copies | gateway | P5 | not_started |
| P7 | CI: test, image build, no manual laptop-only steps | P1 | P8 | not_started |
| P8 | Network picture: public gateway, private services | P2 | P7 | not_started |

Platform labs **P1–P8** are real features. Either person can take one lab while the other takes a product feature (08, 09, …), as long as you do not edit the same files. Labs are how we learn Docker, Kubernetes, and cloud **by shipping**.

---

## 7. The learning block (use this every day)

Before you write feature code, write short notes under these headings. Same headings every day. Six hours total: about two hours of notes, four hours of shipping.

1. **Pre-context.** What is already running, in one paragraph.
2. **Definition.** What the feature is, in two or three sentences. Define any new word.
3. **Why now.** Which later feature becomes a rewrite if we skip this.
4. **Junior shortcut.** Describe the simple version. Then name the production incident it causes (wrong tenant, double write, hang, stale prompt, split brain).
5. **Production shape.** Where the data lives (Postgres, Redis, OpenSearch, object storage). What is in memory. What happens with two copies of the process.
6. **Breaks at scale.** One concrete failure at 10,000 requests per second sustained, 20,000 peak, 5,000 concurrent inbound calls, 5,000 concurrent outbound calls, 100,000 agents, or millions of messages.
7. **Choice.** One option we take. Two options we reject, each with the cost.
8. **Cloud later.** What becomes a managed service (RDS, ElastiCache, MSK, S3) and what must already be true in code (health checks, no disk state, stateless process).
9. **Low-level design.** Tables, indexes, API paths, status codes, and "if this dependency fails, we return this."
10. **Ship check.** The test you will run today that fails if the junior shortcut ships.

Day 2 of the feature adds the production deep topic from section 8. You still ship code that day.

---

## 8. Production deep topics (every second day)

These topics repeat across the product. Each feature below names the one you study while you build it. Spend the first hour of day 2 on that topic, tied to your code, then finish the feature.

| Deep topic | Plain meaning | Where it shows up |
| --- | --- | --- |
| Transactions and lost updates | Two writers. One commit must not erase the other. | Agent versions, role changes |
| Idempotency | A retry is normal. A second row is a bug. | Messages, billing, tool calls |
| Timeouts, one retry, circuit breaker | A dead vendor must not hold a worker forever. A retry storm multiplies cost. | Model gateway, web acquisition, any HTTP call |
| Cost policy and unit budgets | Paid actions need allow/deny before the vendor call, not after the bill arrives. | Web acquisition, model gateway caps, Feature 26 |
| Horizontal vs vertical scale | More copies vs a bigger machine. Memory state breaks the first option. | Gateway, runtime, widget connections |
| Distributed lock vs database constraint | A lock in Redis expires. A unique key in Postgres does not forget. | Refresh tokens, unique agent names, publish pointer |
| Queues and backpressure | Kafka for events many consumers read. A job queue for work that must retry. Do not do heavy work inside the HTTP request. | Ingest, workflows, campaigns |
| Tenant leaks | A missing `workspace_id` in one query returns another customer's row. | Every new table |
| Streaming and proxies | A long connection dies at a load balancer if you do not send heartbeats. You cannot blindly retry after the user already saw tokens. | Runtime, widget, voice |
| Voice stage latency | STT, LLM, TTS, and time-to-first-audio must be traced per `call_id`. You cannot tune 5,000 calls from one log line. | Voice service, model gateway, Feature V1 |
| Observability | Logs, metrics, and traces share one `request_id`. You cannot fix a 10,000 rps system from one laptop log. | Every service, then a dedicated alerts feature |
| Secrets and rotation | A key in a log line or in git is public. Rotation must not take the platform down. | Model keys, tool credentials |
| Read-your-writes | After publish succeeds, the next read must see the new pointer. A lagging copy must not answer that read. | Versions, inbox assignment |
| Failure domains | One bad tenant or one bad vendor must not take every worker. | Runtime limits, voice, cloud |

The short table is the index. **Section 8A** is the deep study. Read the lab before you build it. Do not skip to YAML.

---

## 8A. Deep learning labs (Docker, Kubernetes, cloud)

These labs sit **beside** product features. They are not "read a blog and stop." Each lab has a study block and a ship block. The study block is the larger part. If you cannot explain the failure in a sentence, do not merge the YAML.

How to use a lab:

1. Spend the first half of the day on **Learn** (write notes in your own words).
2. Spend the second half on **Build**.
3. End with **Explain back**: what a junior does, what breaks with two copies, what the cloud will change later.

Words for this section:

| Word | Meaning |
| --- | --- |
| Image | A packed snapshot of your app and its runtime. It is not a running program yet. |
| Container | A running image. It has its own files and its own network address. |
| Docker Compose | One file that starts many containers on **one machine**. Good for the laptop. Weak as the production control plane. |
| Pod | The Kubernetes word for one or a few containers that share a network and live and die together. |
| Deployment | A Kubernetes object that keeps N copies of a pod running, and replaces them on a new image. |
| Service | A stable name and address in front of changing pods. Clients use the Service, not a pod IP. |
| Ingress | The HTTP front door into the cluster. In our design only the gateway sits here. |
| Readiness | "This copy can take traffic now." If it fails, the load balancer stops sending new calls. The process stays up. |
| Liveness | "This process is stuck. Kill it." A wrong liveness check restarts healthy apps during a slow database. |
| Horizontal scale | More copies. |
| Vertical scale | A bigger machine for one copy. |
| Rolling update | Replace copies one by one so the service never goes to zero. |
| Control plane | The Kubernetes brain (API server, scheduler). It does not run your Node code. |
| Node | A machine in the cluster. Pods are placed on nodes. |
| Namespace | A folder inside the cluster. Staging and prod should not share one namespace. |

### How the pieces sit on top of each other

```text
Your TypeScript process
    inside a container
        inside a pod
            kept alive by a Deployment (ask for 2 copies)
                reached through a Service
                    reached from the internet only if it is the gateway, via Ingress

Postgres and Redis are not "just more Node pods" in production.
On the laptop they are containers.
In the cloud they are managed databases. The app still uses a URL.
```

A junior mixes these layers. They SSH into a server, edit a file, and call that deploy. The next crash has no record of what was running. An image plus a Deployment is the record.

---

### Lab P1 — Docker images

**Status:** `not_started`  
**Can run beside:** any product feature that is not editing the same Dockerfile

#### Pre-context

Today we run `pnpm start` on the laptop. Compose runs Postgres and Redis, not our Node services. A new teammate must install Node, copy env vars, and start four terminals. That is not how production starts a process.

#### What Docker is

Docker builds an **image** from a **Dockerfile**. The image contains Node, your compiled JavaScript, and the files you copied. It does not contain your laptop's home directory. A **container** is that image running with limits (CPU, memory) and env vars you pass in at start.

The image is built once and run many times. If the image works on your machine and in CI, the "works on my laptop" class of bugs shrinks. It does not shrink logic bugs. A tenant leak is still a tenant leak inside a beautiful image.

#### What a junior usually does

- Copies the whole repo, including tests, `.env`, and `node_modules` from the laptop.
- Runs as root.
- Uses `latest` as the only tag, so yesterday's image and today's image have the same name.
- Puts `JWT_ACCESS_SECRET` in the Dockerfile with `ENV`. Anyone who can pull the image can read the secret.
- Stores uploads in `/tmp` inside the container. The next deploy deletes them.

#### What production needs

- **Multi-stage build.** Stage 1 compiles TypeScript. Stage 2 copies only `dist` and production dependencies. The final image does not need the compiler.
- **Non-root user.** A bug in the app should not be root on the node.
- **Pinned base image.** `node:22-bookworm-slim` with a digest or a clear version, not a floating tag you cannot rebuild.
- **Tag = git sha.** `quickstart-gateway:b9eaac0`. `latest` is a nickname, not the thing you roll back to.
- **No secrets in the image.** Secrets arrive as env or as mounted files at runtime.
- **One process per container.** Do not start identity and gateway in the same container. One crash should not hide which service died.
- **Listen on `0.0.0.0` and `$PORT`.** A container that listens on `127.0.0.1` looks healthy and receives nothing from the network.

#### What breaks at scale

Image size and startup time matter when you start tens of copies. A 2 GB image that runs `tsc` on boot makes a rolling update slow. Build in CI, run the compiled file.

A container has no durable disk. If agent uploads land in the container filesystem, the next restart loses them. Postgres and object storage are the disks that count.

#### Choice

We take one Dockerfile pattern for every service, multi-stage, non-root, sha tags.

We do not take one giant image that runs all services. That brings back the monolith we split on purpose.

We do not take Docker as a substitute for tenant tests. The image only packages the process.

#### Cloud later

The same image runs on your laptop, in CI, and in the cluster. The registry (GitHub Container Registry, ECR, and so on) stores the sha. The cluster pulls the sha. You do not rebuild on the server.

#### Build

- [ ] `deploy/docker/gateway.Dockerfile` (and the same pattern for identity, workspace, agent)
- [ ] `.dockerignore` so `.env` and `node_modules` are not copied
- [ ] Document `docker build` and `docker run` with env vars, port 3000, health `GET /healthz`
- [ ] Image does not contain `JWT_ACCESS_SECRET` (grep the image history or the Dockerfile in review)

#### Done when

A second person can run the gateway container against Compose Postgres and Redis without installing the repo's Node modules inside the container.

#### Still unsafe

No cluster yet. No scan of CVEs in the base image yet. Add a note in the Dockerfile comment that scanning is lab P7.

---

### Lab P2 — Local Kubernetes, two copies of the gateway

**Status:** `not_started`  
**Needs:** P1

#### Pre-context

Compose starts one container per service on one machine. Kubernetes is a **control plane** that keeps asking "do we have the number of pods we asked for?" If a pod dies, it starts another. That is the difference. Compose will not do that for you unless you add extra tools.

We use a **local** cluster (kind or k3d). We do not open a cloud account in this lab.

#### What Kubernetes is doing

You apply YAML. The API server stores it. The scheduler places pods on nodes. A controller notices "I want 2 gateway pods and I have 1" and starts the missing one.

You do not SSH to start Node. If you need SSH to fix a deploy, the lab is not done.

Objects we will use first:

| Object | Why it exists |
| --- | --- |
| Namespace `quickstart-local` | Keeps this experiment off other local clusters |
| Deployment `gateway` with `replicas: 2` | Two copies of the same image |
| Service `gateway` | One DNS name, traffic split across the two pods |
| ConfigMap | Non-secret settings (`IDENTITY_URL`, ports) |
| Secret | The JWT secret. Not in git. |

We do **not** start with Ingress controllers, service mesh, or Helm charts that hide the YAML. Read the YAML. Generate Helm later if the YAML repeats too much.

#### What a junior usually does

- Puts `replicas: 3` on a service that stores sessions in memory. Each copy has a different session. Users get logged out at random.
- Uses pod IP in the client. Pod IPs change. The Service exists so you do not do that.
- Runs Postgres as a pod with an emptyDir disk, then is surprised the data vanished. For this lab, Postgres stays in Compose **or** a pod with a PersistentVolume. Write down which one you chose.
- Copies a tutorial that exposes every Service as LoadBalancer, including the database.

#### What production needs

- Gateway `replicas: 2` proves the rate limit is shared. Hit both pods. The Redis counter must be the same Redis. If each pod had its own Redis, the limit would be doubled. That is the experiment.
- Identity, workspace, and agent can stay at 1 replica in this lab. The lesson is the gateway, because it is the public door.
- Service DNS: `http://gateway.quickstart-local.svc.cluster.local`. Other pods use that name, not `localhost`. Inside a pod, `localhost` is the pod itself, not your laptop.
- Resource requests: a small CPU and memory request so the scheduler can place the pod. Without requests, a noisy pod can starve the node. This is vertical thinking inside a horizontal system. Requests are not the same as limits. A limit kills the process when it passes the number. Start with requests. Add limits when you know the steady number.

#### What breaks at scale

Two replicas with a `Map` rate limiter allow twice the traffic. We already moved the limiter to Redis. This lab is the proof.

A Service without readiness (lab P3) sends traffic to a pod that is still starting. You will see random 500s during deploy. That is why P3 exists. You can still finish P2 by showing two ready pods and a shared Redis key.

#### Choice

We take kind or k3d plus plain YAML in `deploy/k8s/local/`.

We do not take a full EKS cluster in this lab. Cloud accounts are feature 29. The YAML habits move there.

We do not take a service mesh. A mesh does not authenticate a customer. The gateway does.

#### Cloud later

The same Deployment shape runs in EKS or another managed Kubernetes. The node type and the load balancer change. The replica count and the Redis URL change by environment. The idea "more pods, shared Redis, no local disk" does not change.

#### Build

- [ ] `deploy/k8s/local/` with namespace, gateway Deployment (2 replicas), Service, ConfigMap
- [ ] Secret created by a command in the README, not committed
- [ ] README: install kind or k3d, load the image, apply, `kubectl get pods`, curl health through port-forward
- [ ] Show a Redis key used by both pods (rate limit or a tiny debug counter you remove after the note)

#### Done when

Killing one gateway pod (`kubectl delete pod`) brings a new pod back, and the other pod still serves `/healthz` during that time.

#### Still unsafe

Probes may be too naive. Secrets handling is finished in P4. This lab proves replicas and self-heal.

---

### Lab P3 — Probes, graceful shutdown, rolling update

**Status:** `not_started`  
**Needs:** P2

#### Pre-context

A process can be "running" and still be unable to talk to Postgres. Kubernetes does not know that unless we tell it.

#### What these checks mean

**Readiness.** The pod is in the Service endpoints only when readiness succeeds. Use it for "database ping works" and "Redis ping works." When Postgres is down, readiness fails, and the load balancer stops sending **new** calls. Old calls can finish.

**Liveness.** Kubernetes kills the pod. Use it only when the process is deadlocked (event loop stuck). Do not point liveness at Postgres. A database blip would restart every pod, which makes the blip worse.

**Startup probe.** A slow boot (migrations, JIT, cold start) should not be killed by liveness. We do not run migrations in the web pod (see below), so startup can be short. Still know the knob.

**Graceful shutdown.** On SIGTERM, stop accepting new connections, finish the ones you have, close the database pool, exit. Kubernetes waits `terminationGracePeriodSeconds` (often 30s) then sends SIGKILL. If you ignore SIGTERM, in-flight publishes die mid-way. Our services already close the HTTP server on SIGTERM. This lab checks that the container actually receives the signal. A shell as PID 1 sometimes swallows it. Prefer `exec` form in Docker (`CMD ["node", "dist/index.js"]`) so Node is PID 1.

**Voice pods.** HTTP `terminationGracePeriodSeconds: 30` is not enough when calls last minutes. For `voice-service`, document **stop accepting new calls on SIGTERM**, drain existing media streams, then exit — often **120s+** grace or a preStop hook that fails readiness first. Feature **V1** proves drain with simulated long calls.

**preStop.** A short sleep or a "fail readiness first" hook gives the load balancer time to stop sending traffic before the process exits. Without it, a few requests hit a pod that is already dying.

**Rolling update.** `maxUnavailable: 0` and `maxSurge: 1` means "start a new pod, wait until it is ready, then stop an old one." The service never goes to zero copies. A bad image that fails readiness stops the rollout. That is what you want. A junior sets `maxUnavailable: 100%` and takes an outage on every deploy.

#### What a junior usually does

- One HTTP check used for both liveness and readiness, and that check always returns 200.
- `npm start` as a shell script, so SIGTERM never reaches Node.
- Migrations on every pod start. Two replicas run migrations together and corrupt `schema_migrations` or lock the table at the worst moment.

#### What production needs

- Readiness hits `/readyz` (dependency checks). Liveness hits `/healthz` (process only) or a simple live path that does not call the database.
- Migrations are a **Job**, one shot, before the Deployment rolls. If the Job fails, do not roll the Deployment.
- Rolling strategy written in the YAML, not left as the default you have never read.

#### What breaks at scale

During a deploy at 10,000 requests per second sustained, a few seconds of "pod is in the endpoints but already closing" becomes a visible error spike. preStop plus readiness is how you cut that spike.

A migration lock from six pods starting at once can stall writes for the whole product. One Job avoids that.

#### Choice

We take separate live and ready endpoints, exec-form start, a migrate Job, and a rolling strategy with `maxUnavailable: 0`.

We do not take "restart the pod if Postgres is slow."

#### Cloud later

The load balancer uses the same readiness idea. Managed databases do not remove the need for the probe. They remove the need for us to operate disk failover.

#### Build

- [ ] Gateway Deployment: readiness `/readyz`, liveness `/healthz`, preStop, rolling update
- [ ] `deploy/k8s/local/migrate-job.yaml` example for one service
- [ ] A note in the lab README: kill Postgres, show the pod becomes NotReady, show it is **not** CrashLoopBackOff from liveness
- [ ] Confirm Dockerfile `CMD` is exec form

#### Done when

You can show a NotReady pod that is still running, and a rollout that keeps at least one ready pod.

---

### Lab P4 — Config and secrets

**Status:** `not_started`  
**Needs:** P1  
**Can run beside:** P3

#### Pre-context

`.env` on a laptop is fine. `.env` in git is a leak. An image with `ENV JWT_ACCESS_SECRET=...` is a leak you can pull from a registry.

#### What config and secrets are

**Config** is not secret: port numbers, upstream URLs, feature flags, log level. A ConfigMap is a Kubernetes object that holds those keys. Change the ConfigMap, restart the pods (or use a tool that restarts them). A running process will not see the file change unless you coded a reload. Assume restart.

**Secrets** are passwords, JWT signing keys, database URLs with passwords, model API keys. A Kubernetes Secret is only base64. Base64 is not encryption. Anyone with permission to read Secrets in the namespace can read them. In the cloud, seal them with KMS or use an external secret store. For the local lab, a Secret that is **not in git** is the lesson.

Twelve-factor rule: the same image, different config per environment. Staging and prod do not get two Dockerfiles.

#### What a junior usually does

- Commits `deploy/k8s/secret.yaml` with the real key.
- Uses one Secret for every environment.
- Logs `process.env` on startup "to debug."
- Mounts the Docker socket into the app "so it can deploy itself." That is root on the node.

#### What production needs

- ConfigMap for URLs. Secret for `JWT_ACCESS_SECRET` and `DATABASE_URL`.
- The app still reads environment variables. Kubernetes injects them. The TypeScript does not import a Kubernetes client to find its own database URL.
- A startup check we already have: refuse to boot if the JWT secret is shorter than 32 characters. Keep that. The cluster will show CrashLoopBackOff, which is the correct signal.

#### What breaks at scale

A leaked signing key means every access token can be forged until you rotate. Rotation means: new key, short overlap or forced re-login, old key removed. If the key is inside the image, rotation means rebuild every service. If the key is a Secret, rotation means update the Secret and roll the pods. That is the operational difference.

#### Choice

We take ConfigMap + Secret injection, image stays generic.

We do not take HashiCorp Vault in this lab. Vault is a real product. Learning it before we can explain a Kubernetes Secret will hide the basics. Feature 16 is application-level secrets for customers. This lab is platform-level secrets for **our** processes.

#### Cloud later

AWS Secrets Manager or SSM, or External Secrets operator, feeds the same env vars. The application code stays. IAM decides which pod identity can read which secret. A node role that can read every secret is the junior IAM bug.

#### Build

- [ ] Example ConfigMap committed
- [ ] `secret.example.yaml` with fake values, and a README line: copy to `secret.yaml`, do not commit
- [ ] `.gitignore` entry if a local secret file would sit in the repo
- [ ] Gateway pod shows the upstream URL from the ConfigMap (`kubectl exec` print the URL only, never print the secret)

#### Done when

The image runs with two different ConfigMaps (local ports vs in-cluster DNS) without a rebuild.

---

### Lab P5 — Database connections under many copies

**Status:** `not_started`  
**Can run beside:** a product feature if you only add pool settings and a short ADR

#### Pre-context

Each Node process opens a pool of Postgres connections. That is invisible on a laptop with one process. It becomes an outage when you add pods.

#### What a pool is

Opening a TCP connection to Postgres is slow, so the process keeps a pool (for example 10 connections) and reuses them. TypeORM and `pg` both have pools. If you do not set a max, the default can be high.

**The math.** 2 gateway pods do not need Postgres. Identity, workspace, agent, conversation, runtime, web-fetch, knowledge, voice, and a migrate job do. Suppose 9 services × 2 replicas × 20 connections = 360 connections. A small managed Postgres might allow 100. The 101st connection waits or fails. The app looks "slow" and the database is only full of idle connections.

**PgBouncer** (or the RDS / Aurora proxy equivalent) sits between the app and Postgres and multiplexes many app connections onto fewer database connections. Write the formula in this lab. At 10,000 requests per second we will run more than two copies of several services. A pooler is **required before the production load test** if `services × replicas × pool_size` is near `max_connections`. Do not wait for the first outage. The pooler does not fix a missing `workspace_id` or a transaction that waits on a model call.

**Statement timeout.** A query without a timeout can hold a connection for minutes. Set a server or session timeout so a forgotten `SELECT` cannot pin a worker. Long migrations use a different role or a higher timeout. Do not use the request pool for a 20-minute index build.

**Idle in transaction.** A request that `BEGIN`s and then waits on an LLM call holds a connection and row locks. Publish must not call an LLM inside the transaction. This lab writes that rule next to the pool numbers.

#### What a junior usually does

- Sets pool size to 100 "so we are fast" on every service.
- Runs `CREATE INDEX` on a big table inside the web process at startup.
- Uses one shared database user with superuser rights for the app.

#### What production needs

- A written budget: max connections on the server, pool size per process, replica count, headroom for migrations and admin.
- App user can read and write product tables, not create roles.
- Slow query log or `statement_timeout` so a bad query shows up before it eats the pool.

#### What breaks at scale

Horizontal scale of the app **increases** database connections. Vertical scale of one database has a hard connection cap. People add pods and take down Postgres. This is the most common "we scaled the app" incident.

#### Choice

We take an explicit pool size in config, a short ADR with the formula, `statement_timeout` for the app role, and a pooler before the production load test when the formula says we are near the cap.

We do not take a second Postgres cluster per service as the first fix. We do not raise every pool to 100.

#### Cloud later

RDS and Aurora have `max_connections` tied to instance size. A bigger instance is vertical scale. It buys connection slots and I/O. It does not fix a query missing `workspace_id`. Read replicas are for read-heavy reports. Publish and "read after write" stay on the primary.

#### Build

- [ ] `docs/architecture/postgres-connections.md` with the formula using our real services, including identity, workspace, agent, conversation, runtime, web-fetch, knowledge, voice, and a migrate job
- [ ] Pool max set from env in one service as the pattern (identity or workspace), default small for local
- [ ] Decision line: when the formula exceeds Aurora `max_connections`, add PgBouncer or the managed proxy before Feature 30 load
- [ ] Note in the agent publish design: no network call inside the DB transaction

#### Done when

The doc lists a number for "safe replicas" on a Postgres that allows 100 connections, and the code default matches the doc.

---

### Lab P6 — Metrics that still work with two copies

**Status:** `not_started`  
**Can run beside:** P5

#### Pre-context

Logs tell a story for one request (`request_id`). They are a bad way to answer "how many 500s in the last five minutes?" across two pods.

#### What metrics, logs, and traces are

**Log.** One event. "This request failed." High detail. Expensive if you log the body.

**Metric.** A number over time. "500s per second." Cheap if the label set is small. This is what alerts use.

**Trace.** A tree of spans for one request: gateway → agent → workspace. You use it when one request is slow and the metric only says "p99 is bad."

All three should carry `request_id` or a trace id. They answer different questions. A junior picks one and ignores the other two.

**Cardinality.** A label is part of the metric name in practice. `status=500` is fine. `user_id=<uuid>` creates one series per user and will knock over Prometheus. Workspace id is 10,000 values. Do not put it on every metric. Put it in the log line when you are debugging one customer.

**Two copies.** Each pod exports its own counters. The scraper adds them. A counter in Node memory resets when the pod restarts. That is correct for a rate. It is wrong for "money this month." Money stays in Postgres (feature 26).

**RED and USE.** RED for the gateway: Rate, Errors, Duration. USE for the pool: Utilization, Saturation, Errors. You do not need 40 dashboards. You need these.

#### What a junior usually does

- Logs every request at debug in production and fills the disk.
- Alerts on CPU above 80% with no error alert. A retry storm can be a CPU success.
- Uses a global variable as the only dashboard.

#### What production needs

- `/metrics` or OTel export we already started with the collector in Compose.
- Counters: requests, errors by status class, upstream timeouts.
- Histogram: latency on the gateway.
- An alert file: error ratio over 5 minutes, and "readiness failing."

#### What breaks at scale

The metrics system dies from labels before the app dies from traffic. The app dies from a full connection pool while CPU looks calm. The dashboard must show pool waiting, not only CPU.

#### Choice

We take a small RED set on the gateway and the existing OTel collector path.

We do not take a metric per route template that includes raw ids.

#### Cloud later

Prometheus, Grafana, CloudWatch, or a vendor can scrape the same numbers. Do not rename metrics when you change vendors. Renames break alerts.

#### Build

- [ ] `docs/architecture/observability.md` with the metric list and the labels we allow
- [ ] One alert rule in `deploy/observability/`
- [ ] A curl that forces a 401 and a note showing `request_id` in the log

#### Done when

The doc answers "are we failing?" and "are we slow?" without telling anyone to grep a laptop.

---

### Lab P7 — CI builds the image

**Status:** `not_started`  
**Needs:** P1

#### Pre-context

A green test on a laptop is not a deploy. The cluster runs an image. CI is the place that runs tests and builds that image from a known git sha.

#### What CI is for

On every pull request: install, typecheck, unit tests that do not need a cloud account. On merge to the main branch: build images tagged with the git sha. Do not tag only `latest`.

CI is not a place to store production secrets. The JWT secret for tests is a fixed test string. The production secret stays in the secret store.

**Supply chain.** Pin actions and base images. A junior points `uses: some-action@main` and trusts whatever that branch is tomorrow. Pin a sha or a release.

**Tests that need Redis.** Gateway tests need Redis. CI should start Redis as a service container, or skip those tests with a clear line. A silent skip is how a broken rate limit ships. Prefer a real Redis service in CI for the gateway job.

#### What a junior usually does

- Builds the image on their laptop and `docker push`es from a home network.
- Runs `curl | bash` in CI from an unpinned URL.
- Makes the deploy job use an admin cloud key that can delete the account.

#### What production needs

- PR checks block merge when tests fail.
- Image tag equals the commit sha.
- The deploy job, when it exists, can roll the gateway image and cannot rewrite IAM for the whole company. Smallest permission that can push an image and update a Deployment.

#### What breaks at scale

This lab does not fail because of request rate. It breaks when two people ship and nobody knows which image is in the cluster. The sha tag is the fix.

#### Choice

We take GitHub Actions (the repo is on GitHub): test job, image job on main.

We do not take a custom Jenkins server for this program.

#### Cloud later

The same workflow pushes to ECR and runs `kubectl set image` or updates a manifest. Feature 29 wires the cluster. This lab can push to GHCR first so the pipeline exists.

#### Build

- [ ] `.github/workflows/ci.yml` runs typecheck and tests
- [ ] Image build job documented, tag is the github sha
- [ ] README line: how to see which sha is deployed

#### Done when

A pull request shows a pass or fail without a human running `pnpm test` as the only gate.

---

### Lab P8 — The network picture

**Status:** `not_started`  
**Needs:** P2

#### Pre-context

On the laptop every port is open: 3000, 3001, 3002, 3003, 5433. That is convenient and it is not the production picture.

#### What the network is

**Public.** The internet can reach the gateway, and only the gateway. TLS ends at the load balancer or ingress. Inside the cluster, traffic can be HTTP on a private network. Still authenticate. Private does not mean trusted forever. A stolen pod can call other services. The gateway already checks JWT. Internal services still check the token or the auth header.

**Private.** Identity, workspace, agent, Postgres, Redis have no public IP. Security groups or Kubernetes network policy drop traffic that does not come from allowed pods.

**East-west.** Service to service. This is where a missing timeout hangs a chain: gateway waits on agent, agent waits on workspace, workspace waits on Postgres. Every hop has a timeout. We already return 503 or 504 when an upstream dies. The network picture is why that code exists.

**Egress.** Runtime and tools call the public internet (LLM vendors, customer APIs). A cluster that allows all egress is normal at the start and dangerous later. An allow-list belongs with tools (feature 15). This lab only draws the picture and blocks **inbound** access to the database.

#### What a junior usually does

- Publishes Postgres `0.0.0.0:5432` in the cloud security group "for a GUI."
- Puts all pods in one flat network and calls it done because "it is inside the VPC."
- Forgets that `kubectl port-forward` is an admin backdoor. It is fine for debug. It is not the product path.

#### What production needs

- A one-page diagram in the repo: user → ingress → gateway → services → data stores.
- NetworkPolicy or a documented security group: database accepts traffic only from app pods.
- No NodePort for Postgres in the local manifest examples.

#### What breaks at scale

The scale failure is blast radius. One public database is every tenant. One open admin port is a full read of chats. This is not theoretical. It is the usual cloud incident.

#### Choice

We take a diagram plus a local NetworkPolicy sketch that denies ingress to Postgres except from app namespaces.

We do not take a service mesh in this lab.

#### Cloud later

The diagram maps to: ALB or NLB → gateway Service → cluster IP services → RDS and ElastiCache in private subnets. NAT gateway for egress has a cost. Know that egress to the LLM is not free.

#### Build

- [ ] `docs/architecture/network.md` with the diagram and the sentence "only the gateway is public"
- [ ] Example NetworkPolicy YAML, even if the local cluster needs a plugin to enforce it. The YAML is the learning object. Say if kind is not enforcing it yet.

#### Done when

A reader can point at the only public box and at the data stores that have no public port.

---

### How labs pair with product work

| Day | Person A can ship | Person B can ship |
| --- | --- | --- |
| A product day | Feature 08 versions | Feature 09 conversations |
| A platform day | Lab P1 or P2 (images and two gateway pods) | Feature 08 or 09 if the files do not overlap |
| A deep study day | Lab P3 probes and shutdown | Lab P5 connection math |

Do not turn a lab into a rewrite of the agent service. If a lab finds a real bug (SIGTERM not reaching Node, pool default too high), fix that bug in a small change and record it in the daily log.

### What we are not studying in these labs

- A service mesh (Istio, Linkerd) as the first step.
- Multi-region active-active. Feature 30 talks about recovery in one region first.
- Building our own Kubernetes. We use a local cluster, then a managed control plane.
- Custom schedulers, operators, and CRDs. We do not have a problem that needs them.

---

## 9. Finished features (short record)

The long day-by-day notes for 01–07 were the old format. The decisions still live in ADR 0001–0007. Do not rebuild these.

What we learned that still applies:

- One Postgres database, shared tables, `workspace_id` on every tenant row. A database per customer does not fit 10,000 organizations in this program.
- Redis is for counters, sessions, and short locks. If Redis is empty, users and agents must still exist in Postgres.
- The gateway is the public door. Internal ports are for local debug.
- Permission checks use one function and shared strings in `packages/contracts`. Scattered `if role === admin` will drift.
- Agent updates use `expected_version`. Two saves must not silently overwrite.

---

## 10. Feature 08 — Agent versions and publish

**Status:** `done`  
**Needs:** agent drafts  
**Can run beside:** Feature 09  
**Deep topic (day 2):** transactions and lost updates  
**Owns:** `services/agent-service` version code, and the agent gateway routes for publish and versions

### Pre-context

We can create and edit an agent draft. The draft row changes in place. Publish on the workspace service only checks permission. Nothing stores "this exact prompt was production at 3pm."

### What this is

A **version** is a copy of the draft at the moment someone publishes. After that, the copy does not change. **Publish** inserts that copy and moves a pointer that means "production is this version." **Rollback** moves the pointer to an older version. It does not edit the old copy. The draft stays editable for the next publish.

### Why now

The runtime (feature 12) will read "what is production." If we point it at the draft row, every edit changes live chats, and we cannot roll back.

### Junior shortcut

The junior shortcut updates the live agent and stores history as a JSON array on the same row. Two people publishing at once overwrite the array. A bug that updates a "history" object rewrites the past. There is no single pointer a runtime can read by primary key.

### Production shape

Postgres holds `agent_versions` (insert only) and a production pointer on the agent (or a small pointer row). The publish function runs in **one database transaction**: insert version, move pointer, commit. If the process dies in the middle, the transaction rolls back and production still points at the old version.

Two app copies are safe because the database is the lock, not a variable in Node.

### What breaks at scale

Publish is rare. The dangerous load is the runtime reading the pointer on every chat turn. That read must be a primary-key lookup. A long transaction that also calls an LLM will block those reads. Publish must only copy rows and move the pointer.

Two publishers with the same `base_version`: one commit wins, the other gets 409. If we skip `base_version`, both think they published their own draft.

### Choice

We take immutable version rows plus a pointer, with `base_version` on publish.

We reject a git repo per agent. Git is a poor way to answer "what is production for this workspace" at chat speed.

We reject blocking publish on an eval score. That couples two unfinished systems. Eval can gate publish later.

Cost: more tables, and clients must send `base_version`.

### Cloud later

The table stays on managed Postgres. Publish reads and writes stay on the primary so a replica cannot serve a stale pointer after success. The app stays stateless.

### Low-level design

- Table `agent_versions`: id, workspace_id, agent_id, version number, snapshot JSON (the draft fields), created_at, created_by. No updates. A test or a DB privilege should make updates fail.
- Pointer: `production_version_id` on the agent, or a `agent_release` row. Include `workspace_id` on every query.
- `POST .../agents/{id}/publish` body: `base_version`. Success returns the new pointer.
- `POST .../rollback` body: target version id. Moves the pointer only.
- `GET` list versions, `GET` diff as a read of two snapshots (the diff is not a second source of truth).
- States for the draft environment can be draft, testing, staging, production as labels. Illegal jumps return 409. The immutable row is still the source of what was published.
- If the version insert succeeds and the pointer update fails, the transaction rolls back.
- Gateway: these routes go to the agent service. Remove the workspace publish stub once the real route exists, or keep the permission check in one place only. Do not have two publish implementations.
- Do not log full instructions.

### Learn today

Write notes for headings 1–10 in section 7, using this feature. Draw the transaction: insert version, move pointer, commit.

### Build today

**Track A (this feature, end to end)**

- [x] Migration for versions and the pointer
- [x] Publish, rollback, list, diff
- [x] Reject stale `base_version` with 409
- [x] Test: two publishes, one conflict; cross-workspace version id returns 404
- [x] Gateway routes and a short curl example
- [x] ADR `docs/adr/0009-agent-versioning.md` with the failure lines above

**Track B** is feature 09. Do not split this feature into "one person writes SQL, the other only writes docs."

### Done when

A caller can publish, see a frozen version, edit the draft without changing that version, roll back the pointer, and get 409 if they publish from a stale base. Another workspace cannot read the version.

### Still unsafe

Runtime (Feature 12) reads the production pointer per turn. A conversation already in flight may still finish on the version id bound at turn start. We do not kill a model call mid-flight inside this feature.

---

## 11. Feature 09 — Conversation service

**Status:** `done`  
**Needs:** gateway and workspace (agent id may be empty until versions exist)  
**Can run beside:** Feature 08  
**Deep topic (day 2):** idempotency  
**Owns:** `services/conversation-service` and `proxy-conversation.routes.ts`

### Pre-context

We have users, workspaces, and agent drafts. We do not store chats. Redis is not the chat database. If we only kept messages in memory, a restart would delete the inbox.

### What this is

A **conversation** is a thread inside a workspace. A **message** is one row with a sequence number `seq` (1, 2, 3, …). The client sends an **idempotency key** so a retry does not create a second message.

### Why now

The runtime needs a place to append user and assistant messages. The widget and the inbox will read the same rows later. If we invent a second chat store inside the runtime, we will migrate under load.

### Junior shortcut

The junior shortcut inserts a message with `count(*) + 1` as the sequence, with no idempotency key. Two requests at once get the same `seq` or a gap. A timeout on the client causes a duplicate user message. Listing "all messages for the org" scans every tenant.

### Production shape

Postgres is the source of truth. `seq` is allocated in the same transaction as the insert (a counter on the conversation row, `UPDATE ... SET next_seq = next_seq + 1 RETURNING`, then insert the message). Unique `(conversation_id, idempotency_key)` makes the retry return the first row.

Two app copies are safe because the counter lives in Postgres, not in a process variable.

### What breaks at scale

Millions of messages per day will need an index on `(workspace_id, conversation_id, seq)`. A list API that loads every message in the workspace will time out. The hot path is "append one message" and "read this conversation after seq N."

Partitioning and archival are not this feature. Call that out as still unsafe. Do not block the first correct append on a partition design.

### Choice

We take Postgres, a per-conversation counter, and an idempotency key.

We reject Redis as the only store. A flush would delete chats.

We reject a gap-free sequence built only in the application without a transaction. Two copies will race.

Cost: every send is a transaction. That is cheap next to a model call, and it is the correctness boundary.

### Cloud later

Managed Postgres. The HTTP handler stays stateless. Attachments, when they exist, go to object storage, not the local disk. The local disk on a cloud host disappears on restart.

### Low-level design

- `conversations`: id, workspace_id, optional agent_id, status, created_at
- `messages`: id, workspace_id, conversation_id, seq, role, body, idempotency_key, created_at
- Unique `(conversation_id, idempotency_key)` and unique `(conversation_id, seq)`
- Index `(workspace_id, conversation_id, seq)`
- `POST /v1/workspaces/{id}/conversations`
- `POST /v1/workspaces/{id}/conversations/{id}/messages` with `idempotency_key`
- `GET` messages with `after_seq` cursor
- Every query includes `workspace_id`. Wrong workspace returns 404.
- Retry with the same key returns the original message and does not increment `seq`.
- If Postgres is down, return 503. Do not write the message to a local file.

### Learn today

Section 7 headings, plus one example of a retry that must not double-insert.

### Build today

**Track A (this feature, end to end)**

- [x] New service, migration, `make conversation-migrate`
- [x] Create conversation, append, list by seq
- [x] Idempotency test and cross-workspace test
- [x] Gateway proxy file and README smoke steps
- [x] ADR for the failure policy

### Done when

A chat survives a Redis flush. Messages have a stable order. A retry does not duplicate. Another workspace cannot read the thread.

### Still unsafe

No partitioning, no archive job, no realtime push. The widget will need the cursor fields (`conversation_id`, `after_seq`) which this API must already return.

---

## 11A. Feature 09B — Membership cache

**Status:** `done` (2026-09-28)  
**Needs:** workspace  
**Placement in product path:** §5B — first item on the current focus path (before ingest and retrieval)  
**Can run beside:** Feature 11 (different packages day: land contracts + one service consumer first)  
**Deep topic (day 2):** fail-closed vs fallback when Redis is empty  
**Owns:** shared helper in `packages/*` (or gateway + services adopt), ADR for cache policy

### Pre-context

Agent, conversation, runtime, and voice edge check workspace membership. Today that is often an HTTP call to workspace-service per request. At 10,000 HTTP rps and at thousands of voice turns per minute, that hop becomes the bottleneck.

### What this is

A short TTL cache in Redis: `(user_id, workspace_id) → { roles, ok }`. Postgres and workspace-service stay the source of truth. On cache miss, call workspace once and set the key. On revoke or role change, invalidate or wait for TTL (pick one in the ADR and test it).

### Why now

Feature 12 and Feature 21 both need membership on every turn. Voice cannot add a fourth HTTP hop per utterance.

### Junior shortcut

Cache forever with no invalidation. A removed member keeps access until restart. Or cache in a `Map` per process so two gateway copies disagree.

### Production shape

Shared Redis key prefix. TTL in the 30–120 second range unless the ADR says otherwise. **Write path** (role change, remove member): invalidate or fail closed. **Redis down:** document fail-closed on voice new calls and runtime turns, or fallback to workspace HTTP with a strict timeout — pick one.

### Low-level design

- Contract type `MembershipSnapshot` in `packages/contracts`
- Test: two processes share the same cached allow
- Test: after simulated revoke, access denied within the policy window
- No membership check removed from services; only the hot path is cached

### Done when

Runtime (or gateway proxy) can serve repeated reads without workspace HTTP on every call, and tests prove cross-process consistency.

### Still unsafe

No global session store for end users of the widget. This cache is staff/API membership only.

---

## 12. Feature 10 — Model gateway

**Status:** `done`  
**Needs:** none (do not wait for the runtime)  
**Can run beside:** Feature 10B or 11  
**Deep topic (day 2):** timeouts, one retry, circuit breaker  
**Owns:** `services/model-gateway` (ADR 0010, `docs/api/model-gateway-errors.md`)

### Pre-context

No service calls an LLM yet. When the runtime exists, it must not import a vendor SDK. The first vendor outage would become a rewrite of the runtime.

### What this is

A small service with two operations: **complete** (one full answer) and **stream** (tokens over time). Vendor SDKs stay inside this service. Callers see our error codes, not the vendor's raw body.

### Why now

The runtime should depend on a stable interface. Usage fields (model, tokens, latency) must be recorded now or billing cannot be rebuilt later.

### Junior shortcut

The junior shortcut calls the vendor from the runtime and retries five times on any error. A timeout holds a worker until the process is killed. A stream that already showed tokens gets a second answer glued on. Logs print the API key.

### Production shape

Each call has a timeout. We retry **once**, and only when no token was sent to the caller. If a fallback model is configured, we call it once. If the error rate is high, the circuit breaker opens and we return a typed error instead of retrying.

Keys live in the environment for now. They must not appear in logs.

This service records usage. It does not send invoices. It enforces a **global outbound cap** (config number) so 20,000 peak HTTP requests cannot open 20,000 vendor connections. Per-workspace caps live in the runtime and share Redis so two runtime copies agree. When the cap is full, return a typed error or queue. Do not retry until the vendor recovers.

### What breaks at scale

10,000 API requests per second sustained (20,000 peak) is not 10,000 model calls per second. Model calls are slow and billed. A retry storm at peak multiplies the bill. One workspace must not be able to occupy every outbound connection. Put a cap in the design even if the first cap is a simple config number. Voice adds a second budget: 5,000 concurrent inbound calls and 5,000 concurrent outbound calls, each holding a long connection. Consider a separate **in-flight cap** or pool for voice-originated model calls so chat and phone do not share one undifferentiated limit at peak.

### Choice

We take our own model gateway, two providers so fallback is real, timeout, one safe retry, optional fallback.

We reject "the runtime imports the vendor SDK."

We reject an infinite walk over every provider we have keys for.

Cost: we maintain an adapter per vendor.

### Cloud later

The service stays stateless. Keys move to a secret store (feature 16, then the cloud secret manager). Timeouts stay in code. The cloud load balancer will not fix a missing timeout.

### Low-level design

- `POST /internal/complete` and `POST /internal/stream` (gateway may keep these off the public internet until the runtime is the only caller)
- Map timeout, vendor 429, and vendor 5xx to our error envelope with `request_id`
- Emit a usage record: provider, model, input tokens, output tokens, latency, workspace_id. A log event is enough. No invoice math. Do not write a billing row on this request.
- Global outbound connection / in-flight cap. Reject or queue when full.
- Test with a fake vendor: timeout, 429 once, fallback when the first call fails before tokens, no second full answer after tokens started
- If the vendor hangs, the caller sees timeout. The process stays up.

### Learn today

Section 7, plus a drawing of timeout → one retry → fallback → typed error.

### Build today

End-to-end service, fake provider in tests, ADR, and a short error table in `docs/api/`.

### Done when

A caller can complete and stream against the fake provider. A hung provider returns a timeout. Usage fields are present. No key in logs.

### Still unsafe

No money ledger yet (Feature 26). No hard spend budget per tenant. Streaming to a browser is the widget's job later. This service only speaks to the runtime and to tests. The global cap in this feature is a connection cap, not a dollar cap.

---

## 13. Feature 10B — Web fetch service

**Status:** `done`  
**Needs:** workspace (membership checks on every call)  
**Can run beside:** Feature 11 (different directories: `services/web-fetch-service` vs knowledge ingest)  
**Deep topic (day 2):** cost policy, provider failover, and queues  
**Owns:** `services/web-fetch-service` (local port **3007**), ADR **0011**, `packages/contracts` web-fetch types, `docs/api/web-fetch-errors.md`

### Pre-context

Knowledge ingest, tools, leads, and campaigns all need **public web content** (one URL, many pages, or search results). Olostep is one vendor. If we embed Olostep inside the knowledge worker, the runtime, and the lead worker, we will ship four different timeout, retry, and billing behaviors. One bad crawl in the gateway HTTP request will hold a worker and bypass tenant caps.

### What this is

A dedicated internal service — **web acquisition** — that performs **acquisition actions** for a workspace: **scrape** (one URL), **crawl** (many pages under a seed), **map** (discover URLs), and **search** (web search). Callers (knowledge ingest, runtime tool stage, lead/campaign workers) call **our** API. Vendor HTTP stays inside **provider adapters**. Olostep is the first adapter; **direct HTTP fetch** (cheap, no JS) is the second so we can route simple pages without paid credits. More vendors (Firecrawl, Jina, Browserless, and so on) plug in without renaming the service.

### Why now

Feature 11 will add URL and site sources. Feature 15 will add live `fetch_url` / `search_web` tools. Feature 23–24 will scrape prospect sites. If each feature imports a vendor SDK, cost and failure policy diverge and we cannot enforce a workspace budget at 10,000 organizations.

### Junior shortcut

The junior shortcut calls Olostep from the knowledge worker with no timeout, retries every 5xx forever, and logs the API key. Crawls run inside `POST /knowledge/sources` so one 500-page site blocks the gateway. There is no record of credits spent, so Finance cannot reconcile Feature 26. When Olostep is down, ingest silently fails with a generic 500 and no fallback provider.

### Production shape

**HTTP ingress is thin.** `POST /internal/acquire` (or action-specific routes) validates `workspace_id`, runs **policy**, then either executes synchronously for a single scrape with a short deadline or **enqueues** a long crawl/search job and returns `job_id` + status. Workers call providers with per-action timeouts, **one safe retry** only when no partial billable output was committed, and a **circuit breaker per provider profile**.

**Policy engine (required in v1, not “later”):** Before any paid action, evaluate:

- Global in-flight cap (Redis, same pattern as model-gateway).
- Per-workspace **daily acquisition unit budget** (config + Redis counter; Postgres is the audit trail via usage facts).
- **Provider selection:** e.g. `direct_http` for allow-listed hosts and `text/html` only; Olostep when JS rendering or anti-bot is needed; deny if budget exhausted → typed `ACQUISITION_BUDGET_EXCEEDED`, not a hang.
- **Maintenance switches:** disable a provider profile via env/config without redeploying callers; open circuit → try next profile in the ordered list once, then fail typed.

**Cost accounting:** Every completed action emits a **usage fact**: `workspace_id`, `action`, `provider`, `units` (pages, queries, or scrape count), `estimated_cost_micros` (from a static price table in config until Feature 26), `request_id`, idempotency key. No invoice math on the hot path. Knowledge ingest stores normalized **markdown/text** in object storage (or a blob table locally); it does not store vendor raw JSON as the source of truth.

**Secrets:** Provider API keys live in this service’s environment (later Feature 16 / secret manager). Keys never appear in logs or in caller responses.

### What breaks at scale

Crawl and search are **slow and billed per page or query**. Ten workspaces starting full-site crawls at once must **queue**, not open ten thousand outbound connections from one Node process. One workspace must not exhaust the global provider rate limit for everyone. A missing `workspace_id` on a stored artifact is a **data leak**, not a performance issue. At 10,000 HTTP rps on the gateway, **zero** of those requests should be long-running crawls; crawls are jobs on this service’s worker pool.

### Choice

We take a **dedicated web-fetch-service**, provider adapter interface, policy + usage facts in v1, queue for crawl/search, Olostep + direct HTTP as first two providers.

We reject naming the service after Olostep or putting vendor SDKs in knowledge ingest, runtime, or gateway.

We reject synchronous full-site crawl on any public API route.

Cost: we maintain adapters and a price table. That cost is smaller than reconciling four divergent integrations after launch.

### Cloud later

Workers scale horizontally. Redis caps and budgets are shared across replicas. Provider keys move to the managed secret store. The queue becomes SQS (local ElasticMQ already exists). Egress from this service is expected; firewall allow-lists are a platform concern (lab P8), product allow-lists stay in policy for customer URLs.

### Low-level design

- Internal auth: same internal token pattern as model-gateway (`Authorization: Bearer` shared secret); not exposed on gateway :3000 until a product route needs it (tools may call via runtime → internal only).
- `POST /internal/scrape` — sync, strict timeout (e.g. 30s), returns normalized text + metadata.
- `POST /internal/crawl` — async job, returns `job_id`; worker pages with max depth/pages from request caps.
- `POST /internal/search` — async or sync with low `max_results` cap.
- `GET /internal/jobs/:jobId` — status, error code, artifact location pointer (not full body in list APIs).
- Provider interface: `scrape`, `crawlPage`, `search`, health probe; each profile has `name`, `enabled`, `priority`, `unit_cost_micros`.
- Policy module: `decide(context) → { allow, provider_profile, reason }` — unit-test without network.
- Postgres (optional v1): `acquisition_jobs` for job status; artifacts in object storage path `workspace_id/job_id/...`.
- Tests: fake provider; budget deny; circuit opens → fallback profile; idempotent job create; no API key in logs.

### Learn today

Section 7 headings, plus a table of **who calls web acquisition** (knowledge 11, tools 15, leads 24, campaigns 23) and which actions are sync vs queued.

### Build today

End-to-end service on port 3007, fake provider in tests, Olostep adapter behind env flag, ADR 0011, contracts types, error doc, README smoke with `WEB_ACQUISITION_INTERNAL_TOKEN`.

### Done when

A caller can scrape via fake provider with usage fields present. A crawl job returns before all pages finish and completes in the worker. Budget policy returns a typed error without calling the vendor. Two service replicas share the Redis in-flight cap. No vendor key in logs.

### Still unsafe

No dollar invoicing (Feature 26). No customer-visible “web credits” UI. No browser automation farm of our own. Legal/compliance for crawling customer sites is workspace responsibility; we log `workspace_id` and seed URL for audit (Feature 27).

---

## 14. Feature 11 — Knowledge ingest

**Status:** `done` (2026-09-28)  
**Needs:** Feature 10B, workspace, OpenSearch from `make up`  
**Placement in product path:** §5B — after **09B**, before **13** (retrieval)  
**Can run beside:** Feature 09B (different service directories; do not edit `packages/*` the same day as 09B)  
**Deep topic (day 2):** queues and backpressure  
**Owns:** `services/knowledge-service` (or equivalent) plus ingest worker. Do not put parsing, embedding, or **web fetch** inside the gateway request.

### Pre-context

OpenSearch is running and empty of product data. Agents have no documents. Web acquisition (10B) is the only place that calls scrape/crawl/search vendors.

### What this is

A business adds a **source**: pasted text, uploaded file, **single URL**, or **site crawl** (seed URL + limits). We store source metadata, split content into chunks, embed, and index with `workspace_id`. Ingest status is visible: queued, running, ready, failed. For URL and site sources, the ingest worker **requests normalized text from web acquisition (10B)** and then runs the same chunk → embed → index pipeline as file/text sources.

### Why now

Retrieval (feature 13) needs indexed chunks. If the runtime invents a one-off loader, delete and tenant filters will be missing.

### Junior shortcut

The junior shortcut parses and embeds inside the HTTP request. A large file holds the gateway worker. A crash in the middle leaves half an index with no status. Chunks are stored without `workspace_id`, so search returns another tenant's text.

### Production shape

The HTTP request only records the source and enqueues a job. A worker does parse, chunk, embed, index. The job queue retries with a dead-letter path. OpenSearch holds the search documents. Postgres holds source metadata and status. Object storage holds the file bytes when we are not on a laptop disk.

Two workers may pick jobs. The job id must be idempotent so the same source is not indexed twice as two truths. Use a source version.

### What breaks at scale

Embedding is the slow, paid step. 1,000 uploads at once must queue, not stampede the embedding API. Search load must not sit on the Postgres primary. A missing workspace filter is a data leak, not a slow query.

### Choice

We take Postgres for status, a queue for work, OpenSearch for chunks.

We reject doing the whole pipeline inside the request.

We reject pgvector on the primary as the long-term search path. It is fine for a demo and dangerous when search and writes share one database at our target rate.

Cost: we operate a queue and a search cluster. Locally, Compose already has both.

### Cloud later

S3 for files, a managed queue, managed OpenSearch. The worker is a separate process so we can scale it without scaling the gateway.

### Low-level design

- `sources`: id, workspace_id, name, `kind` (`text` | `file` | `url` | `site`), status, error, `acquisition_job_id` when kind is `url` or `site`, created_at
- `chunks` metadata in Postgres optional; search docs in OpenSearch with `workspace_id`, `source_id`, text, vector
- URL/site: enqueue ingest only after 10B returns text or crawl job completes; respect 10B budget errors and surface them on the source row
- Delete source: mark deleted, enqueue delete, remove search docs. A failed delete stays visible.
- Re-index creates a new source version. Old chunks for that version are removed when the new version is ready, or we search by active version. Pick one and test it.
- Do not log full document bodies at info level.

### Learn today

Section 7, plus where the HTTP request ends and the worker begins.

### Build today

End-to-end: create source, worker indexes a small text, search by workspace returns only that workspace, failed embed sets status failed and can retry.

### Done when

One document becomes searchable chunks for one workspace only. A second workspace does not see them. The upload request returns before embedding finishes.

### Still unsafe

No PDF parser required for the first slice if plain text works end to end. No reranker yet. Site-wide crawl depth and page caps are enforced in **10B**, not reimplemented here.

---

## 15. Feature 12 — Agent runtime

**Status:** `done` (2026-09-28 — chat turn path)  
**Needs:** 08, 09, and 10 (met); **09B** before production scale on the turn path  
**Deep topic (day 2):** streaming and "do not retry after tokens" (still open)  
**Owns:** `services/runtime-service`. It calls model gateway and conversation. It does not own their tables.

**Shipped (2026-09-28):** `services/runtime-service` :3006, gateway `proxy-runtime`, non-streaming `POST .../turns`, production pointer, `agent_version_id` on assistant messages, idempotency, 409 unpublished, 404 cross-workspace; tests in `turns.test.ts`.

### Pre-context

We can publish an agent, store messages, and call a model behind our gateway. Nothing connects them.

### What this is

The runtime loads the **production pointer**, loads the conversation, calls the model gateway, and appends the assistant message. The first version is a single model call. Tools, retrieval, and memory are later steps in this same loop.

### Why now

This is the first time a configured agent can answer. If we start it before versions exist, it binds to a mutable draft.

### Junior shortcut

The junior shortcut reads the draft row, calls the vendor SDK, and writes the reply with no timeout. A publish during the turn changes the prompt mid-flight with no record of which version ran. A client retry creates two assistant messages.

### Production shape

At the start of the turn, read the production version id and keep it on the message row (`agent_version_id`). The turn finishes on that snapshot even if someone publishes again. Model calls go through the model gateway. The assistant message uses an idempotency key.

The process is stateless. Two runtimes can handle different conversations. A limit per workspace caps how many model calls that workspace can run at once so one tenant cannot fill every worker. That cap lives in Redis, not in process memory, because two runtime copies must share it. Membership for the turn path uses the same short Redis cache as other services; do not add a fourth HTTP hop to workspace on every token.

### What breaks at scale

The slow part is the model, not the CRUD. Holding the HTTP connection during a long completion limits how many chats one process can serve. Streaming helps the user see tokens, but the gateway must not do the model work itself. It proxies. Connection count becomes the limit before CPU does.

### Choice

We take a separate runtime service, production pointer only, model gateway only, conversation service for storage.

We reject a second agent engine for voice later. Voice will call this runtime.

We reject putting the vendor SDK here.

Cost: more network hops. Each hop needs a timeout.

### Cloud later

Scale the runtime horizontally. The cap per workspace must live in Redis, not in one process. Health checks must fail when the model gateway is unreachable if we want the load balancer to stop sending traffic. Decide that in the ADR and test it. Runtime is HTTP and streams. It is not the 5,000 + 5,000 voice sockets.

### Low-level design

- `POST /v1/workspaces/{id}/conversations/{id}/turns` with idempotency key
- Load pointer; 409 if nothing is published
- Append user message if the client sent text and the key is new
- Call model gateway with timeout
- Append assistant message with the version id
- Stream path: proxy tokens; on failure before tokens, return the typed error; after tokens, mark the turn failed in storage and do not start a second full answer on the same stream
- Cross-workspace conversation id returns 404
- **Voice contract (required for Feature 21):** internal or public turn with `channel: voice`, stricter `deadline_ms`, optional shorter history window; same idempotency and `agent_version_id` rules as chat. Runtime does not hold audio sockets.
- Before model call: if conversation `state` is `human` (Feature 18), return typed error and do not call model gateway

### Learn today

Section 7. Write the turn as a sequence of calls and the status code for each failure. Add the voice-turn sequence with a 8–12s deadline example.

### Build today

One non-streaming turn against the fake model gateway, plus one test that an unpublished agent cannot run, plus one test that workspace B cannot run workspace A's conversation. Document the voice-turn request shape in `packages/contracts` even if voice-service ships later.

### Done when

A published agent can answer once, the message history shows the reply, and the stored row records which version ran. Voice-service can call the documented voice-turn API in tests (fake audio not required in runtime repo).

### Still unsafe

No streaming turn path yet. No per-workspace model concurrency cap in Redis. **Voice-turn** contract (`channel: voice`, `deadline_ms`) deferred to Feature **21** prep (see §5C). No tools, no retrieval (Feature 13), no memory, no widget. Human handoff (`state=human`, Feature 18) not wired. Membership still HTTP to workspace on downstream services until **09B**. Retrieval on voice calls needs a strict budget (Feature 13 addendum).

---

## 16. Feature 13 — Retrieval in the runtime

**Status:** `done` (2026-09-28)  
**Needs:** 11 and 12  
**Placement in product path:** §5B — after **11** ingest (embed + index); extends Feature **12** runtime loop  
**Can run beside:** Feature 14 if the files do not overlap. If both change the runtime loop, only one person edits the runtime that day. The other can build the retrieval query API in the knowledge service.  
**Deep topic:** tenant leaks in search

### Pre-context

Chunks can be indexed. The runtime answers from the prompt only.

### What this is

Before the model call, the runtime asks the knowledge service for chunks in **this workspace**, puts them into the prompt, and stores which chunk ids were used (so we can debug later).

### Why now

Without a tenant filter at retrieval time, the model will quote another customer's document. That is the failure we are designing against.

### Junior shortcut

Search the whole index with the user text and trust the model not to mix tenants. Or filter in application code after a wide search. Both leak or waste cost.

### Production shape

The search request includes `workspace_id` as a filter in the search engine, not only in Node after the fact. The runtime times out the search and still answers, or fails the turn, based on a written policy. Pick one: "answer without docs" vs "fail the turn." Write it in the ADR. Default for this product: fail the turn with a typed error if search is required and search is down, so we do not silently drop a company's knowledge. If the agent has no sources, skip retrieval.

### What breaks at scale

A search that returns huge chunks will blow the model context and the bill. Cap the number of chunks and the characters. At 1,000 chats per second, search latency becomes part of p99. The lookup must use the index, not a scan of every chunk in Postgres.

### Choice

We take workspace-filtered search, a hard cap on chunks, and a timeout.

We reject "search everything and hope."

Cost: answers get worse when the cap is too small. That is a product knob, not a reason to remove the filter.

### Cloud later

Managed OpenSearch. The runtime still passes tenant id. The cloud service will not add the filter for us.

### Low-level design

- Knowledge service: `POST /internal/retrieve` with workspace id, query text, limit
- Runtime calls it with the same timeout policy as other hops
- Persist `retrieved_chunk_ids` on the assistant message or a side table
- Test: two workspaces, similar text, only the caller's chunks return

### Done when

A turn includes only the caller's documents. A test fails if the other workspace's text appears.

### Still unsafe

No rerank model required in the first slice. No citation UI. Say so.

---

## 17. Feature 14 — Memory

**Status:** `not_started`  
**Needs:** conversations and runtime  
**Deep topic:** what is allowed in memory vs what is a secret

### Pre-context

Each turn sees the recent messages we send. There is no durable "this user prefers mornings" store.

### What this is

Memory is a small set of facts tied to a workspace and a subject (the end user of the chat, not our staff user). The runtime may read those facts into the prompt and write new facts after a turn.

### Why now

If we stuff all history into every prompt forever, cost and latency grow without a bound. Memory is the bounded summary. Raw history stays in the conversation table.

### Junior shortcut

The junior shortcut writes memory as one JSON blob with no workspace id, or asks the model to remember secrets (API keys, card numbers). The next tenant, or the next log line, sees them.

### Production shape

Postgres rows: workspace_id, subject_key, fact, updated_at. A cap on fact count and fact size. The model is not the source of truth. We store what our code accepts after a size check. We do not store raw secrets. Define a denylist in the ADR (passwords, card numbers, access tokens).

### What breaks at scale

Loading every fact for a workspace on every turn is a sequential scan at 10,000 organizations. Index `(workspace_id, subject_key)`. The hot path is one subject, not the whole company.

### Choice

We take explicit rows and a cap.

We reject an unbounded vector memory as the first design. It is harder to delete and harder to explain.

Cost: the memory will be incomplete. That is acceptable. The conversation log is complete.

### Cloud later

Same Postgres. Deletion must remove the rows when a customer asks. Write the delete path now, even if the UI comes later.

### Low-level design

- CRUD for facts, tenant scoped
- Runtime reads facts for the subject on the turn
- Test: workspace B cannot read workspace A's facts
- Test: an oversized fact is rejected

### Done when

A fact saved for a subject shows up on the next turn for that subject only.

### Still unsafe

No fancy extraction model required. A simple write API plus a read in the prompt is enough. Document that extraction quality is not the goal of this slice.

---

## 18. Feature 15 — Tools and MCP

**Status:** `not_started`  
**Needs:** runtime  
**Can run beside:** Feature 16  
**Deep topic:** timeouts and idempotency on side effects

### Pre-context

The runtime only talks to the model. It cannot call a customer's HTTP API.

### What this is

A tool is a named action (HTTP request or MCP tool) that the model may request. Our runtime executes it with a timeout, records the input and output, and sends the result back to the model for the next step. The loop stays inside the runtime. We add a stage. We do not replace the runtime.

### Why now

Side effects (create ticket, send email) are where double execution hurts. The design has to exist before we add many tools.

### Junior shortcut

The junior shortcut lets the model call any URL, retries the tool five times, and does not store whether it already ran. A timeout after the customer's API succeeded creates a second ticket.

### Production shape

Tools are configured per agent version (the published snapshot), not edited live under a running call. Execution has a timeout, an allow-list of hosts, and an idempotency key stored before the call when the tool is not safe to repeat. If we do not know whether the first call succeeded, we do not blindly call again. We return "unknown" and let a human path handle it later.

Permissions: reuse `packages/contracts` style checks. Analyst must not gain a new "run tool" right by accident. Add a permission string in contracts in one change, then use it.

### What breaks at scale

Tool calls are slow. A chat that runs ten tools holds a worker. Cap tool calls per turn. A tool that calls back into our public gateway can deadlock if we only have a few workers. Internal calls must not depend on the same tiny worker pool without a timeout.

### Choice

We take an allow-list, a timeout, a per-turn cap, and stored tool-call rows.

We reject "the model may call any URL."

Cost: customers must register hosts. That is the point.

### Cloud later

Egress from the cluster should be restricted. The allow-list in the app is the product rule. The cloud firewall is the second rule. Both can exist. Neither replaces the other.

### Low-level design

- Tables: tool definitions on the agent version snapshot, `tool_calls` with workspace_id, status, idempotency key
- One built-in HTTP tool is enough for the first slice; **`fetch_url` / `search_web` call web acquisition (10B)**, not a vendor SDK from the runtime
- Test: second attempt with the same key does not double-call the fake server
- Test: host not on the allow-list is rejected before any socket
- Test: when 10B returns `ACQUISITION_BUDGET_EXCEEDED`, the tool step fails typed without retrying the vendor

### Done when

A published agent can run one allow-listed HTTP tool, the turn records the call, and a retry does not double-execute.

### Still unsafe

No full MCP catalog required on day one. One MCP or one HTTP tool that proves the loop is enough. Write which one you shipped.

---

## 19. Feature 16 — Secrets

**Status:** `not_started`  
**Needs:** none, but tools should read secrets from here once both exist  
**Can run beside:** Feature 15  
**Deep topic:** secrets and rotation

### Pre-context

Model keys sit in environment variables. Tool credentials do not have a store.

### What this is

A secret is a value encrypted at rest, scoped to a workspace, referenced by name. Services receive the secret at use time. Logs and API responses return the name, never the value.

### Why now

Tools and the model gateway will otherwise keep pasting keys into agent instructions and into git.

### Junior shortcut

The junior shortcut stores the secret in the agent instructions or in a plaintext column, and returns it from `GET /agents`. Anyone with read access, and anyone with a log pipeline, has the key.

### Production shape

Postgres stores ciphertext and a key version. The encryption key is in the environment now and in a cloud KMS later. Decrypt only in the process that needs the byte string for the outbound call. Rotation writes a new ciphertext and keeps the old key version until the new one works. A failed rotation does not delete the old row first.

Two copies of the service can decrypt if they have the same key. Do not cache plaintext in a process-global map that survives after rotation.

### What breaks at scale

The scale problem is blast radius, not requests per second. One log line with a secret is a full leak. One missing `workspace_id` returns another tenant's ciphertext to a buggy decrypt path.

### Choice

We take envelope encryption with a master key, workspace scope, and redacted APIs.

We reject "just use env vars for every customer tool." Env vars do not scale to 10,000 tenants and they are not per-workspace.

Cost: we must operate rotation. Write the rotate API even if the UI is later.

### Cloud later

Master key moves to KMS. The table stays in Postgres. The application code that redacts logs stays. KMS does not redact your logger.

### Low-level design

- `secrets`: id, workspace_id, name, ciphertext, key_version, created_at
- Create, list names, delete, rotate
- `GET` never returns plaintext
- Test: log spy or response body does not contain the raw value
- Test: other workspace gets 404

### Done when

A secret can be stored and used by name by an internal caller in tests, and no API response shows the raw value.

### Still unsafe

No full KMS integration until the cloud feature. Document the local master key as dev-only.

---

## 20. Feature 17 — Website chat widget

**Status:** `not_started`  
**Needs:** runtime streaming  
**Can run beside:** Feature 18  
**Deep topic:** horizontal scale of long connections

### Pre-context

The runtime can answer. There is no browser client. There is no admin UI in this repo yet. This feature is the embeddable chat, not the staff console.

### What this is

A small browser script the customer's website loads. It talks only to the gateway. It uses a **publishable key** (safe to be in JavaScript) that maps to one workspace. It is not the secret API key.

### Why now

This is the first channel a real site can load. If the script contains a secret, that secret is public the moment the page loads.

### Junior shortcut

The junior shortcut puts the service API key in the widget and lets any domain use it. Another site copies the script and spends the customer's model budget. Refresh starts a new conversation and loses history.

### Production shape

The gateway checks the publishable key and the site origin allow-list. The widget sends with `conversation_id` and the last `seq` after reconnect. Transport is SSE plus normal HTTP to send a message, unless we write down why we need WebSocket. SSE is the default because proxies and reconnect are simpler.

The gateway proxies the stream. It does not run the model.

### What breaks at scale

Thousands of open chats mean thousands of held connections. The limit is connection count and memory per connection, not CPU. Heartbeats keep idle proxies from closing the stream. A process restart drops streams. The client must reconnect with `seq` and continue. That only works if conversation storage is already correct.

### Choice

We take publishable keys, origin allow-list, SSE, and reconnect by seq.

We reject a secret in the bundle.

Cost: we must build a key type that is not the org API key.

### Cloud later

The load balancer must allow long SSE timeouts. Sticky sessions are a crutch. Reconnect by seq is the real design, so any copy of the gateway can resume.

### Low-level design

- Issue and revoke publishable keys, workspace scoped, origin list
- Widget bundle in this repo, built as static files
- Send message, subscribe to tokens, replay after seq
- Test: wrong origin is rejected
- Test: reconnect does not duplicate the user message (idempotency key)

### Done when

A local HTML page can chat through the gateway with a publishable key, refresh, and see the same conversation.

### Still unsafe

No inbox UI here. No voice. Polish is not the goal. The failure cases are.

---

## 21. Feature 18 — Inbox and human handoff

**Status:** `not_started`  
**Needs:** conversations  
**Can run beside:** Feature 17 if the widget and the inbox do not edit the same service. Inbox can be an API on the conversation service plus a small staff page. **Voice track:** ship minimal handoff before heavy outbound (Feature 23); callers must be able to escalate to a human.  
**Deep topic:** read-your-writes and two people taking the same chat

### Pre-context

Messages exist. Nobody can assign a chat to a human, and the model does not stop when a human joins. Voice calls use the same conversation row; without handoff, the bot talks over a human on the phone.

### What this is

An inbox is a list of conversations for a workspace, with assignee and state (bot, waiting, human). Handoff sets the state so the runtime will not keep answering while a human owns the thread. Messages from the human are normal message rows with role `human`.

### Why now

Operations need a way to take over. If we bolt this on after voice and campaigns, every channel will invent its own assignee field.

### Junior shortcut

The junior shortcut stores "who is assigned" in a browser session or in memory. Two staff members click "take" and both think they own it. The bot keeps replying because the runtime never reads the state.

### Production shape

Assignee and state are columns on the conversation, updated with a condition (`WHERE state = 'waiting'`) so only one take wins. The other gets 409. The runtime reads state before it calls the model. If state is human, it does not call the model.

### What breaks at scale

The inbox list must be filtered by `workspace_id` and indexed by state and updated time. "All conversations in Postgres" will not load. Pagination is required.

### Choice

We take a conditional update for assignment and a runtime check of state.

We reject a second message store for humans.

Cost: the runtime and the inbox share the conversation row. Agree the column names before coding.

### Cloud later

Same Postgres primary for the assignment write so the runtime cannot miss a take that just succeeded.

### Low-level design

- Fields on conversation: state, assignee_user_id
- `POST .../take`, `POST .../release`
- List API with cursor
- Test: two takes, one wins
- Test: runtime does not call the model when state is human (fake model gateway asserts zero calls)

### Done when

A staff user can take a conversation, send a human message, and the bot stays quiet until release.

### Still unsafe

No email notifications. No mobile app. A simple API plus one page is enough if the tests exist.

---

## 22. Feature 19 — Event platform

**Status:** `not_started`  
**Needs:** the objects that emit events (agent, conversation, handoff). Do not invent events for objects that do not exist.  
**Can run beside:** Feature 20 only after the event envelope exists. Day 1 can be the envelope and one producer. Day 2 can be one consumer. If two people work, one owns the producer library, the other owns one consumer. Do not both edit the topic names.  
**Deep topic:** queues and "at least once"

### Pre-context

Kafka is in Compose. The product does not publish business events yet.

### What this is

After a successful database commit, we publish a fact: `agent.published`, `message.appended`, `conversation.handed_off`. The payload includes workspace_id, ids, and `request_id`. Consumers may see the event more than once. They must be idempotent.

### Why now

Workflows, leads, and usage all need a stream of facts. If each feature polls tables with its own hidden query, we will miss updates and couple every service.

### Junior shortcut

The junior shortcut publishes to Kafka before the database commit. The consumer acts, then the transaction rolls back. Or they treat Kafka as exactly-once and insert duplicate side effects.

### Production shape

Commit Postgres first, then publish. If publish fails, a short outbox table in Postgres retries. Consumers store the event id they already handled. Two copies of a consumer must not double-apply.

### What breaks at scale

A consumer that does slow work on the Kafka thread blocks the partition. Hand off to a job queue for slow work. A missing workspace id in the payload makes every consumer unsafe.

### Choice

We take an outbox and at-least-once delivery with consumer idempotency.

We reject "exactly once" as a promise we make to product code. We promise "we can handle duplicates."

Cost: every consumer writes a little extra bookkeeping.

### Cloud later

Managed Kafka. The outbox still matters. The cloud bus does not make a bad consumer idempotent.

### Low-level design

- Outbox table: id, workspace_id, type, payload, published_at
- One publisher process
- One example consumer that records handoff counts in an idempotent way
- Test: duplicate delivery does not double-count

### Done when

A real product action (publish or handoff) creates an event a consumer can read, and a replay does not double-apply.

### Still unsafe

Not every table emits events on day one. List the events you actually ship.

---

## 23. Feature 20 — Workflow automation

**Status:** `not_started`  
**Needs:** events  
**Deep topic:** retries and poison messages

### Pre-context

Events can exist. Nothing reacts with a multi-step business flow.

### What this is

A workflow is a saved definition: when this event happens, run these steps (call a tool, write a lead, notify). A run row stores the current step so a crash resumes instead of starting over.

### Why now

Campaigns and leads will want triggers. A one-off `if` inside the runtime will not be operable.

### Junior shortcut

The junior shortcut runs all steps inside the event consumer with no run record. A crash repeats step 1. A bad payload retries forever and blocks the partition.

### Production shape

Each run has state in Postgres. Steps that call tools use the tool idempotency rules. A message that fails N times goes to a dead-letter path and leaves the main consumer free. Definitions are versioned so an edit does not change a run that already started.

### What breaks at scale

A hot event ("every message") can create a workflow storm. The definition must allow a filter, and the worker count must be separate from the gateway. One tenant's workflow must not use every worker. Put a per-workspace cap.

### Choice

We take stored runs, step resume, and a dead-letter path.

We reject an unbounded script with full network access as the first engine.

Cost: the first workflows will feel limited. That is acceptable.

### Cloud later

Workers scale horizontally because run state is in Postgres, not in the worker.

### Low-level design

- Tables: definitions, runs, steps
- One trigger: conversation handed off, one action: write a row we can assert in a test
- Test: crash simulation resumes at the next step
- Test: poison message lands in the dead-letter table

### Done when

One real event starts a run, the action happens once, and a forced retry does not duplicate the action.

### Still unsafe

No visual builder. No canvas UI. JSON definition is enough.

---

## 24. Feature 21 — Voice path

**Status:** `not_started`  
**Needs:** 12 (runtime), 09B (membership cache at scale)  
**Can run beside:** 11 if directories differ  
**Deep topic:** streaming, heartbeats, and a second channel that must not fork the agent engine  
**Owns:** `services/voice-service` (local port **3008**), ADR **0012-voice-platform** (draft), `packages/contracts` voice/call types

### Pre-context

Chat can run a turn. Voice does not exist. Runtime exposes a **voice-turn** contract (Feature 12).

### What this is

A voice call is a channel. **Cascade default:** audio in → STT → runtime (text turn) → TTS → audio out. The agent, the **published version**, and the conversation are the same objects as chat. The call has its own session row because audio is realtime. Published agent versions may include **voice settings** (language, TTS voice id, max response length, `voice_mode: cascade | realtime` when ADR allows realtime without tools/RAG).

### Why now

If voice gets a second runtime, we will fix every bug twice.

### Junior shortcut

The junior shortcut builds a separate "voice brain" with its own prompt store. Publish in the agent service does not affect calls. A dropped packet retries the whole model call and the caller hears two answers.

### Production shape

The voice edge is **its own process**. It handles audio and turns it into a turn request to the same runtime. The HTTP gateway on port 3000 never holds the media socket. The runtime still uses the production pointer and the conversation table. Timeouts are shorter than chat because a human is waiting on the phone. If the model misses the deadline, the caller hears a typed fallback phrase, and the conversation row records the failure.

Call state that must survive a restart (call id, conversation id, direction, workspace cap) lives in Postgres or Redis with a TTL. The socket may die on deploy. Recordings go to object storage, not the local disk. Drain time for a voice pod is longer than HTTP (`terminationGracePeriodSeconds` measured in minutes if calls last that long), or new calls stop first and existing calls finish.

### What breaks at scale

5,000 concurrent inbound calls and 5,000 concurrent outbound calls means 10,000 realtime sockets when both sides are full. The voice edge scales horizontally only if call state that must survive a restart is in Postgres or Redis with a TTL, not only in the process. In-memory call state is lost on deploy. Say which state is allowed to die (the socket) and which is not (the conversation).

### Choice

We take one runtime and a separate voice edge for audio.

We reject a second agent configuration store.

Cost: the voice edge is a new service with harder networking.

### Cloud later

This service needs stable outbound media and health checks. The cluster comes in feature 29. The code must already bind `0.0.0.0` and expose health. Do not wait for Kubernetes to discover that call state was only in memory.

### Low-level design

- `calls`: id, workspace_id, conversation_id, direction (inbound or outbound), state, `agent_version_id` snapshot
- `services/voice-service`: health, internal auth, session orchestration; **fake media** test double sends one utterance → one runtime voice-turn → one TTS chunk out
- Emit **usage/trace stubs**: `call_id`, stage timings (STT, runtime, TTS) to logs or OTel — shapes used later by Feature 26
- No second copy of agent fields
- No audio bytes through `services/gateway-service`
- Telephony PSTN and vendor STT/TTS keys are **Feature 21B / 21C**, not required for Feature 21 Done when

### Done when

One simulated call creates a conversation turn through the existing runtime and records the call row. Traces or structured logs include `call_id` and stage latency fields.

### Still unsafe

No PSTN (21C). No production phone numbers. Recording/transcript storage optional stub only. Legal/compliance for call recording documented as deferred.

---

## 25. Feature 22 — Voice reliability

**Status:** `not_started`  
**Needs:** 21  
**Deep topic:** failure domains (one bad call must not stall the rest)

### Pre-context

A simulated call can complete. Real calls drop, arrive twice, and overrun deadlines.

### What this is

Retries policy (no infinite model retry on phone), **barge-in** (stop TTS, accept new utterance), dead-call cleanup, and limits on concurrent calls. **Global Redis caps:** 5,000 inbound and 5,000 outbound platform-wide. **Per-workspace** inbound/outbound caps so one tenant cannot consume the global 5,000. A call that exceeds its deadline ends with a clear state on the call row and a spoken fallback if audio was already open.

### Why now

Without cleanup, leaked sessions hold workers until the process restarts.

### Junior shortcut

The junior shortcut retries the model until the caller hangs up, with no cap. One stuck call occupies a worker forever. A reconnect creates a second conversation.

### Production shape

Every call has a deadline. Workers are released in `finally`. Reconnect uses the call id. Per-workspace concurrent call count lives in Redis so two voice copies share the cap. If Redis is down, refuse new calls (fail closed) rather than unlimited calls.

### What breaks at scale

The failure is leaked concurrency, not a wrong SQL row. At 5,000 inbound and 5,000 outbound, a leak of one worker per call takes the pool down in minutes. The Redis cap is two numbers: inbound and outbound. A workspace that is at its own cap must not consume the global 5,000.

### Choice

We take deadlines, Redis concurrency caps, and fail-closed when the cap store is down.

We reject unlimited retry.

Cost: some calls fail fast when Redis is unhealthy. That is better than a dead pool.

### Cloud later

The cap remains in Redis (managed cache). More voice pods do not multiply the allowed calls by accident.

### Low-level design

- Test: global or workspace cap reached returns a typed error before opening media
- Test: simulated hang releases the worker in `finally`
- Test: reconnect reuses the same `call_id` and conversation
- Test: barge-in cancels in-flight TTS without starting a duplicate assistant message
- ADR: Redis down → refuse **new** calls (fail closed)

### Done when

Those tests pass and the ADR says what happens when Redis is down.

### Still unsafe

No global anycast network. No legal call-recording program. Write the recording decision as "not in this feature."

---

## 25A. Feature 21B — Speech providers (STT/TTS)

**Status:** `not_started`  
**Needs:** 21  
**Can run beside:** 22 if files do not overlap in `voice-service`  
**Deep topic:** timeouts, one retry, circuit breaker (same as model gateway)  
**Owns:** STT/TTS **provider adapters** inside `services/voice-service` (not in runtime)

### Pre-context

Feature 21 proves the loop with a fake media path. Real calls need STT and TTS vendors with keys, timeouts, and usage units.

### What this is

Provider interface: `transcribe(audio_chunk)`, `synthesize(text)` (and streaming variants). Vendors (Deepgram, Cartesia, ElevenLabs, OpenAI speech, etc.) plug in behind env profiles. **One retry** only when no billable output was committed. Circuit breaker per profile. Usage fact per STT/TTS unit for Feature 26.

### Why now

If STT/TTS SDKs land in runtime or gateway, voice scale and billing diverge from model-gateway rules.

### Done when

Fake STT/TTS in tests; one real provider behind env flag optional; no API keys in logs; voice turn works end-to-end in simulation with real adapter code paths.

### Still unsafe

No separate `speech-gateway` service unless traffic proves we need it. Start inside voice-service.

---

## 25B. Feature 21C — Telephony (CPaaS)

**Status:** `not_started`  
**Needs:** 21, 21B, 22  
**Deep topic:** webhook idempotency and media stream security  
**Owns:** telephony adapter in `services/voice-service`, ADR **0013-telephony** (primary: **Twilio** or **Telnyx** — pick one, second as fallback profile)

### Pre-context

Simulated calls work. Customers need inbound DIDs and outbound dial.

### What this is

**TelephonyProvider** interface: buy/link number (staging), inbound webhook → open media stream, outbound `dial`, status callbacks, hangup, **transfer** (later slice). CPaaS streams audio (often μ-law 8 kHz) to a **WebSocket** on voice-service. Sign and verify webhooks. Idempotent handling of duplicate status events.

### Why now

Feature 23 campaigns and real outbound product need PSTN. Feature 21 intentionally defers carrier integration.

### Junior shortcut

Hard-code Twilio in the gateway. Webhooks without signature check. Outbound dial in the HTTP request handler.

### Production shape

All telephony HTTP routes on voice-service (or a dedicated telephony port on the same process), not on gateway :3000. Recordings point to object storage URLs when enabled. Emit telephony usage facts (call minute, direction) async.

### Done when

One inbound and one outbound call through staging CPaaS complete one runtime turn each; caps from Feature 22 enforced; ADR names primary and fallback provider.

### Still unsafe

No AMD/voicemail/opt-out (campaign compliance) — document under Feature 23. No international regulatory bundle.

---

## 25C. Feature V1 — Voice load and drain proof

**Status:** `not_started`  
**Needs:** 22, lab P3 habits  
**Deep topic:** failure domains at long-lived connections

### What this is

A repeatable script: **two** voice-service replicas (or processes), shared Redis caps, **N** simulated long calls (config, e.g. 200–500 locally), assert caps reject excess, kill one process during drain and verify calls end or reconnect per ADR. Not 5,000 on a laptop — prove **shape**: shared Redis, no in-memory-only call state, drain stops new calls.

### Done when

Script passes in CI or `make voice-load-smoke`; README documents how to run it.

### Still unsafe

Not a substitute for Feature 30 full platform load test.

---

## 26. Feature 23 — Campaigns

**Status:** `not_started`  
**Needs:** 21C (telephony), 22 (caps), 09 (conversations)  
**Can run beside:** Feature 24  
**Deep topic:** backpressure (do not dial every lead in one request)

### Pre-context

We can place a single simulated call. We cannot place a controlled batch.

### What this is

A campaign is a workspace-scoped list of targets and a schedule. A worker pulls a small batch, may **enrich targets via web acquisition (10B)** (scrape one page per lead under budget), starts calls through the voice path, and records outcomes on the campaign rows.

### Why now

A batch that starts inside an HTTP request will time out and double-dial on retry.

### Junior shortcut

The junior shortcut loops all targets in the request handler. The client retries and people get two calls.

### Production shape

The request only creates the campaign. A worker claims rows with a database condition so two workers do not dial the same target. Each attempt has an idempotency key. Rate is capped per workspace.

### What breaks at scale

The failure is a thundering herd into the voice edge. The cap is the product. Without it, one campaign consumes every call slot.

### Choice

We take queued claim-by-row and a rate cap.

We reject in-request dialing.

Cost: campaigns are not instant. They drain. Show status on the campaign.

### Cloud later

Workers scale out. The claim SQL stays correct with many workers.

### Low-level design

- Tables: campaigns, targets, attempts
- Test: two workers, each target attempted once
- Test: retry of the create request does not create two campaigns (idempotency key)

### Done when

A campaign of a few fake targets runs through the voice test double once each.

### Still unsafe

No production carrier beyond staging CPaaS. **AMD, voicemail, opt-out, and compliance copy** are not done — document before production outbound at scale.

---

## 27. Feature 24 — Leads

**Status:** `not_started`  
**Needs:** events (a lead can also be created by API if events are late; do not block the table on a perfect bus)  
**Can run beside:** Feature 23  
**Deep topic:** tenant scope and duplicate leads

### Pre-context

Chats and calls do not create a sales lead object.

### What this is

A lead is a workspace-scoped record: source, contact fields, status, link to a conversation if we have one. **Discovery and enrichment** (web search, scrape company URL) go through web acquisition (10B), not ad hoc HTTP from the lead worker. Creating the same lead twice (same idempotency key or same external id) returns the first row.

### Why now

Campaigns and inbox need somewhere to put "this person should be followed up" that is not a random JSON note.

### Junior shortcut

The junior shortcut inserts on every event with no unique key. Replays create five leads. Contact fields from workspace A show up in workspace B's list because the list forgot the filter.

### Production shape

Postgres with unique `(workspace_id, external_id)` when an external id exists. List APIs are paginated and indexed. Events may create leads. The consumer stores event ids.

### What breaks at scale

A list without an index becomes a sequential scan at high lead counts. The write path is not 1,000 per second. The read path still needs the index because staff will refresh the inbox all day.

### Choice

We take a relational lead and idempotent create.

We reject a spreadsheet JSON blob per workspace.

Cost: we must choose a small set of columns. Extra fields can sit in JSON. Say which columns are real.

### Cloud later

Same Postgres. Exports, if any, are jobs, not requests that build a giant file in memory.

### Low-level design

- CRUD plus idempotent create
- Test: replay does not duplicate
- Test: cross-workspace list is empty of the other tenant

### Done when

Those tests pass and a conversation id can be stored on the lead.

### Still unsafe

No CRM sync. No scoring model.

---

## 28. Feature 25 — Evaluation

**Status:** `not_started`  
**Needs:** runtime  
**Can run beside:** Feature 26  
**Deep topic:** do not run eval inside the user-facing request

### Pre-context

We can run a turn. We do not score it.

### What this is

An eval is an offline or async job: given a published version and a fixed set of cases, run the runtime and store scores. It does not sit on the widget's critical path.

### Why now

People will want "do not publish if the score dropped." That gate needs a place to live. We add the runner first. We can attach it to publish after it works. Do not block normal publish on eval in the first slice.

### Junior shortcut

The junior shortcut runs fifty model calls inside the publish HTTP request. Publish times out. A partial score is treated as success.

### Production shape

Publish stays fast. Eval is a job with its own worker, its own timeout per case, and a stored report. Cases are tenant scoped. The report records the agent version id so we know what was scored.

### What breaks at scale

Eval is a cost amplifier. A loop with no cap can spend a month of model budget overnight. Cap cases per run and runs per workspace per day.

### Choice

We take async reports with a cap.

We reject eval-in-the-publish-request for the first slice.

Cost: publish is not automatically safe. The report is visible. A later change can require a report id. Write that as a follow-up, not as silent scope growth.

### Cloud later

Workers scale separately from the gateway. Spend caps still live in our table, not only in the vendor dashboard.

### Low-level design

- Tables: cases, runs, case results
- Fake model gateway returns scripted answers
- Test: cap rejects the extra case
- Test: another workspace cannot read the report

### Done when

A run finishes async and the report matches the scripted answers.

### Still unsafe

No human labeling UI. No automatic publish block.

---

## 29. Feature 26 — Usage and billing

**Status:** `not_started`  
**Needs:** model usage events from the model gateway and runtime; acquisition usage facts from web acquisition (10B); **voice** usage facts from voice-service (21B STT/TTS units, 21C telephony minutes) — **voice slice should land when 21C ships**, not only at end of roadmap  
**Deep topic:** idempotency and money

### Pre-context

The model gateway can emit a usage record. Web acquisition (10B) emits units per scrape/crawl page/search query. Voice-service emits call/STT/TTS/telephony units the same way. We do not turn that into a ledger on the request or on the live call.

### What this is

A ledger row per model call, per acquisition action, and (later) per voice minute: workspace_id, units, `kind` (`model` | `acquisition` | `voice`), idempotency key, price snapshot. Invoices are a later rollup. This feature stores the facts that an invoice would need.

### Why now

If we drop token counts, we cannot rebuild the bill. You cannot reconstruct money from logs you already rotated away.

### Junior shortcut

The junior shortcut adds counters in memory, or updates one "balance" cell without an idempotency key. A retried usage event double-charges. A restart loses the month.

### Production shape

Append-only usage rows in Postgres. Unique idempotency key. The price is copied onto the row so a later price change does not rewrite history. Aggregates for the UI are queries or a daily rollup job, not a single mutable balance as the only source of truth.

### What breaks at scale

Writing a row per token chunk, or a balance update on every voice second, will melt the primary at 5,000 concurrent calls. Write one ledger row per model call and one row per finished call interval (or per call), not per token and not per audio packet. The volume is "model calls and call intervals," which is lower than "HTTP requests." Still index `(workspace_id, created_at)`. The consumer is idempotent. The HTTP handler and the voice worker only emit the fact.

### Choice

We take an append-only ledger.

We reject a single balance column as the only record.

Cost: invoices need a query. That is fine.

### Cloud later

The ledger stays on the primary. A warehouse can copy it later. The product must be correct before the warehouse exists.

### Low-level design

- Table `usage_entries`
- Consumer of the usage event is idempotent
- Test: duplicate event, one row
- Test: cross-workspace sum does not include the other tenant
- Test: a completed call does not write the ledger inside the voice request path (event or outbox only)
- No card charging in this feature

### Done when

A completed fake model call creates one ledger row, and a replay does not add another.

### Still unsafe

No payment provider. No tax. No PDF invoice. Say so in the ADR.

---

## 30. Feature 27 — Audit and security

**Status:** `not_started`  
**Needs:** the write paths we care about (auth, role change, publish, secret delete)  
**Can run beside:** Feature 28  
**Deep topic:** tenant leaks and redaction

### Pre-context

Some tables store who changed a role. There is no single audit log a security review can read.

### What this is

An append-only audit row: workspace or org id, actor, action, target id, request_id, time. It does not store secrets or full prompts.

### Why now

We already have actions that will be questions later ("who published?", "who deleted the secret?"). Retrofitting audit after the fact means guessing.

### Junior shortcut

The junior shortcut logs the JSON body. The body contains instructions and sometimes keys. Logs are not an audit trail. They rotate, and they leak.

### Production shape

The service writes the audit row in the same transaction as the change when the change is in the same database. When the change is in another service, that service writes its own audit row. We do not build a perfect distributed transaction. We do require each service to record its own sensitive actions.

### What breaks at scale

An audit table that stores full prompts will be huge and unsafe. Store ids and action names. A list API without a time filter will scan forever. Require a time range and a workspace or org filter.

### Choice

We take a thin audit table per area (or one table with a type column) and a redaction rule.

We reject "CloudTrail will do it later" as a reason to skip app-level audit. CloudTrail sees cloud API calls. It does not see "who changed this member's role" inside our product.

Cost: every sensitive write grows by one insert.

### Cloud later

CloudTrail and the app audit answer different questions. Keep both. Ship the app audit now so it is true before the cluster exists.

### Low-level design

- Audit insert on publish, role change, secret create/delete, API key create/delete
- Test: secret value is absent from the audit row
- Test: another org cannot list these rows

### Done when

Those actions write audit rows and the tests pass.

### Still unsafe

No SIEM export. No immutable WORM storage. The rows are append-only in application code. A database admin can still delete them. Say that honestly.

---

## 31. Feature 28 — Observability and alerts

**Status:** `not_started`  
**Needs:** services already emit logs and traces through the shared libraries  
**Deep topic:** observability

### Pre-context

We have an OpenTelemetry collector in Compose and structured logs. We do not have a written list of metrics that mean the product is unhealthy, and we do not page anyone.

### What this is

A small set of metrics and one dashboard description: request rate, error rate, latency, saturation (worker pool, Redis errors, database pool), and business counters (publishes, model timeouts, 429s). Alerts fire on error rate and on "Redis fail closed" spikes. Traces keep `request_id`.

### Why now

At 10,000 requests per second sustained you cannot SSH and read a log file. The signals have to exist before the cloud move, or we will deploy blind.

### Junior shortcut

The junior shortcut adds logs inside every if statement and never a metric. Or they alert on CPU only. A tenant-wide data leak does not show up as CPU. A retry storm shows up as success latency and vendor spend, which CPU will not explain.

### Production shape

Use the same `request_id` in logs, metrics labels (low cardinality), and traces. Do not put workspace id on a metric label if that creates 10,000 time series per metric without a plan. Prefer overall metrics plus a break-glass log query for one tenant.

Two copies of a service must export metrics the same way. An in-process counter that resets on deploy is a rate, not a monthly total. Monthly totals belong in the usage table.

### What breaks at scale

High-cardinality labels (raw URL, user id, email) will take down the metrics system. That is the junior metrics bug.

### Choice

We take a short metric list, low cardinality, and a written alert for gateway 5xx and model timeouts.

We reject "log everything and grep."

Cost: we must keep the label set boring.

### Cloud later

The same metrics go to a managed backend. The names should not change when we leave Compose. The collector config can change. The app instrumentation should not.

### Low-level design

- Document the metric names in `docs/architecture/observability.md`
- One alert rule in a file we can load locally
- A test or a script that hits an error path and shows the log line contains `request_id`
- No secret in the log line

### Done when

A teammate can point at the doc and say which chart answers "are we failing?" and "are we slow?"

### Still unsafe

No on-call rotation. No paging vendor. The rule file is the product of this feature.

---

## 32. Feature 29 — Cloud deploy

**Status:** `not_started`  
**Needs:** health checks and stateless services. Do not start this by rewriting features.  
**Deep topic:** horizontal scale and failure domains in a real cluster

### Pre-context

Daily work is Docker Compose on a laptop. Services bind to a port and read env vars. Kubernetes was intentionally not day-3 work.

### What this is

Infrastructure as code for a staging-like environment: managed Postgres, managed Redis, container images, a cluster, a public entry to the gateway only, internal services not on the public internet, migrations as a job that runs before traffic.

### Why now

This is the first time "two copies" is the default rather than a thought experiment. It must not be the first time we discover in-memory session state.

### Junior shortcut

The junior shortcut clicks resources in a console, puts the database on the public internet, and stores files on the container disk. Or they adopt a cluster by rewriting the app. The console path cannot be reviewed. The rewrite throws away the services.

### Production shape

Terraform (or the tool we already chose in `project_details.md`) creates the network and the data stores. Images are built in CI. The gateway is the only public Service. Security groups block direct access to identity, workspace, agent, and the rest. Migrations run as a job, once, not inside every replica startup (or we use a lock so two replicas cannot migrate at once).

Horizontal scaling is adding pods. It is allowed only because rate limits and locks are in Redis and rows are in Postgres.

Vertical scaling is a bigger node. It does not fix a tenant leak.

### What breaks at scale

A migrate-on-startup race with many pods corrupts schema history. A readiness probe that always returns OK sends traffic to a pod that cannot reach Postgres. A liveness probe that checks a slow dependency will restart healthy pods during a database blip. Readiness should fail closed. Liveness should mean "the process is stuck," not "Postgres is slow."

### Choice

We take infrastructure as code, private services, gateway ingress, and a migration job.

We reject click-ops as the source of truth.

We reject moving to a different orchestrator only to avoid Kubernetes if the project standard is Kubernetes. If we change that standard, we change `project_details.md` first.

Cost: YAML and IAM are a feature of their own. Timebox the first environment to staging, one region.

### Cloud later

This feature **is** the cloud move. Keep the region and the account story small. Multi-region is feature 30's recovery discussion, not the first apply.

### Low-level design

- One environment, documented apply/destroy
- Images for gateway and the services we actually run
- No public Postgres
- Health and readiness already in the apps; fix any probe that is wrong
- CI builds images. A manual apply is acceptable for the first slice if the steps are written. Automatic deploy can follow in the same feature if time remains.

### Done when

A second person can apply the staging environment from the repo and hit the gateway health check. Internal service ports are not public.

### Still unsafe

No production customer traffic required. No multi-region. Secrets in the cloud secret manager for the master key and model keys, not in the git repo.

---

## 33. Feature 30 — Load, failure, recovery, SDKs

**Status:** `not_started`  
**Needs:** 29 for the environment you load-test. You can still write the test plan before the cluster exists.  
**Deep topic:** failure domains, recovery, and what "done" means

### Pre-context

Features exist. We have not shown that a dead dependency returns a typed error instead of a hang, under load, with more than one copy.

### What this is

A written load and failure exercise: gateway with two copies, Redis rate limit shared, kill Postgres, kill the model fake, kill one gateway pod. Plus a small SDK that only calls the gateway. Plus a recovery note: backups, who restores, what "message data loss" means.

### Why now

This is the closeout that proves the earlier failure policies are real.

### Junior shortcut

The junior shortcut runs one `curl` on a laptop and calls it load. Or they load-test a path that skips the gateway. Or they write an SDK that calls internal ports.

### Production shape

Load hits the gateway. The report records achieved rate, error rate, and latency. It does not need to hit 10,000 requests per second on the laptop. It needs to show the shape: two gateway copies share the Redis limit, a killed upstream returns 503 or 504 with `request_id`, and the process does not need a manual restart to accept traffic again after the dependency returns. The production target remains 10,000 sustained, 20,000 peak, and 5,000 concurrent calls in each direction.

Recovery: Postgres backups exist in the staging design. The note says RPO and RTO in plain language (how much data we can lose, how long we take to restore). If we have not built backups, the status is "not done," not "we will do it later" hidden inside a green board.

### What breaks at scale

The failures we care about are retry storms, unbounded queues, and restores that bring back secrets into logs. The exercise should include one of each as a checklist, even if the first run is small.

### Choice

We take a repeatable script, a one-page report, and an SDK that uses the public API only.

We reject a new product feature in this slot. If the test finds a hole, fix the hole. Do not add a new domain.

Cost: this feels like "no new UI." It is the production proof.

### Cloud later

Run the exercise in the staging cluster from feature 29. Keep the script.

### Low-level design

- Script: two gateway replicas, shared Redis, health, a burst of authenticated reads, then stop Postgres and assert a typed error
- SDK: login or API key, list workspaces, create agent, publish if versions exist
- `docs/runbooks/recovery.md` with backup and restore steps
- Update this roadmap's board honestly

### Done when

The script's assertions pass, the SDK uses port 3000 only, and the recovery note has real commands.

### Still unsafe

We will not have a year of on-call practice. We will have a system another engineer can deploy, break, and explain.

---

## 34. How to update this file each day

1. Set **Current focus** in section 6.
2. Set the feature status to `in_progress`.
3. Tick the build boxes you finished.
4. Add three lines under the feature: date, what shipped, what is still unsafe.
5. Set status to `done` only when **Done when** is true.
6. If you are blocked, write the blocker in a sentence. Do not start a feature whose Needs are unfinished.
7. If the code and this board disagree, fix the board the same day. The board was wrong before. Do not let it drift again.

### Daily log

| Date | Feature | Shipped | Still unsafe |
| --- | --- | --- | --- |
| 2026-09-28 | 10B | `web-fetch-service` :3007, ADR 0011, contracts, tests | No ledger consumer; artifacts in Postgres only |
| 2026-09-28 | 12 | `runtime-service` :3006, gateway proxy, chat turns + tests | No stream; no voice-turn contract; no Redis membership on path |
| 2026-09-28 | roadmap | §5A–5C order; knowledge-first focus; board statuses | Voice in §5C; 09B → 11 → 13 is current focus |
| 2026-09-28 | 09B | `@quickstart/workspace-access`, ADR 0012, agent/conversation cache | Gateway still does not check URL membership |
| 2026-09-28 | 11 | `knowledge-service` :3009, SQS worker, OpenSearch, gateway proxy, ADR 0013 | Text sources only; no URL ingest via 10B yet |
| 2026-09-28 | 13 | Runtime `KnowledgeClient`, internal retrieve, message metadata | Match search v1; no reranker |
