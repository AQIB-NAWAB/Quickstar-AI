# QuickStart AI project study — October 17, 2026

## Scope

Studied current HEAD `7c6ca1c`, repository organization, product requirements, architecture notes, service documentation, workspace manifests, recent changes, and representative implementation paths across the frontend, access control, agents, runtime/tools, acquisition, knowledge, memory, voice, campaigns, lead research, workflows, evaluation, usage and audit. Compared current code with the October 15 study and checked findings against source.

This is an architectural and implementation study, not a claim to have inspected every line or validated every feature at runtime. The tree contains 1,176 TypeScript/TSX source files and approximately 120,087 lines across web, services and packages, excluding dependencies and generated output. No application source was changed. No stack startup, migrations, paid provider requests, browser acceptance tests, deployment or load tests were performed.

## Product and structure

QuickStart AI is a multi-tenant business AI agent platform. Organizations contain workspaces; workspaces own agents, conversations, knowledge, tools, secrets and operational records. Agents have editable drafts and immutable published releases. A published agent serves website visitors, staff test conversations and voice channels, with staff handoff and supporting research/campaign automation.

- `apps/web`: Next.js 14 App Router, React 18, Tailwind 3, marketing/auth pages and staff workspace UI. Eighteen feature directories. React state and feature-specific clients/repositories implement most screen behavior.
- `services`: nineteen domain services plus a template. Primarily Express and TypeScript, with routes/controllers/services/repositories. Lead generation uses larger standalone HTTP/store/research modules.
- `packages`: nine shared libraries: contracts, auth, HTTP server, errors, logging, tracing, utilities, workspace access and audit writing.
- `fixtures`: widget host pages, demo agent/tool data and a dental clinic API/dashboard on port 4000.
- `scripts`, `Makefile`, Compose: local bootstrapping, migration commands, demo seeding and feature proof scripts.
- `docs`: product targets, roadmap, ADRs, API material, learning guides, prior reviews and handoff notes. Some material describes earlier implementation states.

The workspace uses pnpm and ESM TypeScript. Backends compile with `tsc`; most tests execute compiled `dist` output. PostgreSQL access mixes TypeORM in foundational services and direct `pg` repositories elsewhere. Development infrastructure includes PostgreSQL 16, Valkey, Kafka, OpenSearch, MinIO, ElasticMQ and an OpenTelemetry collector.

## Service ownership

| Area | Responsibilities |
| --- | --- |
| Identity | Registration/login, organizations, sessions, JWTs, refresh rotation, revocation, API keys. Passwords use salted scrypt; refresh tokens are hashed. |
| Workspace | Workspace lifecycle, memberships, roles/permissions, invites and publishable keys. |
| Gateway | Public routing, JWT validation, workspace membership checks, rate limits, publishable-key/origin checks and proxying. |
| Agent | Draft configuration, optimistic updates, tool validation, immutable releases, production pointer, rollback and release differences. |
| Conversation | Durable ordered messages, idempotency, bot/human state, staff ownership, tool execution records and event outbox. |
| Runtime | Agent snapshot selection, history/context assembly, knowledge and memory injection, model calls, tool loops, streaming and response persistence. |
| Model gateway | Provider profiles/drivers, completion/streaming, capacity limits, retries, circuit breakers and usage facts. |
| Web fetch | Search/scrape/crawl acquisition, provider selection, jobs, capacity and daily budgets. |
| Knowledge | Source metadata/content, asynchronous text ingestion, chunking, embeddings and OpenSearch retrieval. |
| Memory / secrets | Subject-key facts; encrypted workspace tool credentials and guarded internal reads. |
| Voice | Calls, speech/realtime sessions, telephony adapters, recordings, concurrency caps and voice campaign orchestration. |
| Campaign | Audiences, contact schemas/imports, schedules, pacing, retry policies, campaign controls and attempts. |
| Lead | Flexible workspace lead schemas, captured fields, filtering, status and idempotent upserts. |
| Lead generation | Business profiles, evidence-backed research/qualification, durable jobs, leases, budgets, organization fairness and campaign delivery tasks. |
| Workflow | Event-driven rules/actions and execution traces, with Kafka event consumption. |
| Evaluation | Per-agent cases, queued runs, pinned-version runtime calls and scoring. |
| Usage / audit | Deduplicated usage ledger/cost estimates; persisted action records and filtered audit reads. |

## Main execution paths

Staff actions generally follow browser → feature client → same-origin Next.js API handler → gateway → domain service → repository. Server-rendered pages also call gateway adapters directly. HTTP-only cookies carry access/refresh tokens; middleware and proxy adapters handle refresh. Shared workspace access clients resolve permissions, cache positive/negative membership snapshots in Redis, and fall back to the authoritative service on cache failures.

Agent changes include an expected revision to detect conflicting edits. Publishing captures a snapshot and changes the production pointer. Runtime normally executes published snapshots; evaluation can pin a particular version. The agent testing panel creates real conversations rather than being purely local UI state.

A chat turn loads its conversation and agent snapshot, appends the user message, assembles history plus available retrieval/memory context, invokes the model or tool loop, and persists the assistant reply. User/assistant idempotency keys support replay. Tool calls are separately recorded with pending/succeeded/failed/unknown states. Staff and internal widget/voice turn implementations differ, so behavior must be checked on each path.

The widget is a plain JavaScript bundle served from `apps/web/public/quickstart-widget.js`. It maintains local conversation state, streams turns, polls for messages and supports live voice. Gateway resolves publishable keys to a workspace/default agent and validates allowed origins. Staff inbox messages use sequence cursors and five-second polling, paused while the document is hidden. Taking a conversation places it under human control; widget messages continue to persist while bot replies are suppressed.

Voice supports cascade speech and realtime session implementations, including OpenAI and Gemini session code. Factories select speech and telephony providers; fake adapters remain available. Call capacity uses Redis and recordings currently use a local filesystem store. Configured code paths do not establish successful live carrier/provider behavior.

Lead research uses PostgreSQL-owned jobs, heartbeat leases, fenced writes, bounded retries and persistent delivery tasks. Research context is snapshotted while operational policy is re-read. Demo and live adapters are explicit. Lead service records, accepted research leads and campaign audiences are related but distinct models.

Conversation handoff can commit an outbox record, which a publisher sends to Kafka. Workflow actions include actual HTTP webhook calls, while email, tag updates and handoff actions in the reviewed executor primarily record side-effect rows. Their successful trace does not establish delivery or mutation in another system.

## Current implementation boundaries

- Agent management, inbox, widget chat, leads, research and campaigns have substantial backend-connected paths.
- Evaluation and audit have production API repositories; older notes implying they are preview-only are stale.
- Analytics now selects `createUsageLedgerDataSource(workspaceId)` for real workspaces. It aggregates returned ledger entries in the browser; conversation/latency metrics and complete reporting remain unavailable. This corrects the October 15 study's analytics statement. The ledger adapter filters one returned list locally, so it should not be assumed to represent complete historical totals.
- Notifications and developer webhook management still select unavailable repositories outside preview mode. Workflow webhooks are a separate capability.
- Knowledge ingestion reads stored objects as UTF-8; this is not a general PDF/Office document parser.
- Workflow webhook secret auth records a secret reference header rather than resolving the secret in the reviewed executor.
- Cloud infrastructure, deploy manifests and SDK directories remain placeholders. The product's throughput/availability figures are design targets, not demonstrated capacity.
- Local port defaults differ across scripts/docs. Web defaults to 3005, which also appears as the model gateway default; the agent/inbox runner puts web on 3015. Startup scripts suppress some build/migration errors and can stop shared development containers on exit.

## Current findings to keep in mind

1. **Unverified internal identity context.** `packages/auth/src/context.ts` serializes plain base64url JSON. Agent auth middleware accepts its actor identity before verifying a bearer token. Direct service reachability therefore matters: agent/runtime servers bind to `0.0.0.0`. Trusted service identity/context and network boundaries need explicit enforcement.
2. **Workspace creation lacks an organization authorization check in the traced path.** Gateway and workspace organization routes authenticate, then controller/service/store create the workspace and owner membership for the supplied organization ID. The store transaction does not verify organization membership.
3. **Cross-organization navigation is incomplete.** `loadWorkspaceShell` searches only `me.organizations[0]`; valid workspaces in another organization can redirect to login.
4. **Last-owner invariant is incomplete.** Role updates have no last-owner demotion guard. Removal checks owners before a separate deletion, leaving a concurrency race.
5. **Invite lifecycle is partial.** Reviewed routes implement create/list/delete, with no redemption endpoint. Account recovery is also absent from the reviewed auth service.
6. **Frontend type errors currently block a clean baseline.** Agent diff/release rendering accesses HTTP-only properties on a union that includes built-in lead tools.
7. **Tool safety is partly heuristic.** Recent code guards missing/invented identifiers, duplicate calls and data changes using parameter checks and visitor-text confirmation heuristics. These deserve dedicated regression coverage, particularly for multi-turn arguments, multilingual input, retries and ambiguous confirmations. HTTP tool execution uses a hostname allow-list; its policy differs from the DNS-pinned public acquisition helper.
8. **Idempotency and deadlines require failure testing.** Persisted pending tool calls and external side effects have crash/concurrency windows; replay records alone are not proof of exactly-once external execution. Some provider deadlines use `Promise.race`, which does not itself cancel underlying work.

## Recent changes understood

HEAD adds extensive agent editor/list/release/test UI work, formatted chat, a dental clinic fixture and tool integration, JSON repair in multiple services, revised HTTP argument mapping, tool guards/result handling, provider 429 retry behavior and inbox polling improvements. The preceding auth work adds redesigned login/register screens with interactive illustrations. These changes extend the existing service architecture rather than replace it.

## Verification performed

| Check | Result |
| --- | --- |
| Repository integrity script | Passed its known incident-signature scan; not a comprehensive security audit. |
| All shared/backend workspace builds | Passed using `pnpm -r --filter './packages/*' --filter './services/*' run build`. |
| Explicit frontend TypeScript check | Failed: six TS2339 errors in `diff-modal.tsx` and `releases-tab.tsx` concerning `method`/`path_template` on `AgentToolDefinition`. |
| Source ESLint | Failed: 44 errors across `apps/web/src services packages tests`, excluding backend `dist`. Full root formatting/lint was not rerun. |
| Recursive tests, no bail | Incomplete/non-green in this sandbox. Multiple suites passed, several HTTP suites failed, and web-fetch did not finish before the run was stopped. A direct template-test diagnostic confirmed `listen EPERM`. This does not attribute every failure to that restriction. |

No clean full test or Next.js production-build result is claimed. Some integration tests are environment-gated; some package test commands discover no tests. Test-runner summaries can show test files rather than individual assertions, so they should not be treated as coverage counts. Root `check` runs integrity → lint → build → typecheck → tests; web has no `typecheck` script and needs its explicit check. Backend tests require a prior build to avoid stale compiled output. Root ESLint currently does not ignore `.next`.

Logs from this session: `/tmp/quickstart-study-build.log`, `/tmp/quickstart-study-web-types.log`, `/tmp/quickstart-study-eslint.log`, `/tmp/quickstart-study-tests.log` and `/tmp/quickstart-study-direct-test.log`.

This study provides context for the next requested task. No fixes, migrations, deployments, commits or external writes were undertaken.
