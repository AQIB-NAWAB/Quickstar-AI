# QuickStart AI project study — 2026-10-15

## Scope and confidence

Repository study at HEAD `46b876c`. Read the repository structure, root configuration, product and roadmap material, recent history, memory-bank context, earlier review, service documentation, and selected implementations across authentication, workspaces, gateway, agent runtime, knowledge ingestion, lead research, voice, workflows, and staff data adapters. Ran integrity, builds, typechecks, lint, and tests as described below.

This is an architecture and implementation assessment, not a claim to have read every line or proved every runtime path. No paid provider calls, live customer operations, database migrations, browser acceptance tests, cloud deployment, or load/recovery experiments were performed. Application source was not changed.

## Architecture map

The repository contains 19 domain services plus a service template, nine shared packages, and a Next.js staff/marketing app with 18 feature directories. It has roughly 117,000 lines of TypeScript across web, services, and shared packages, excluding generated output and dependencies.

The main staff path is browser → Next.js page/server adapter or API route → gateway → domain service → persistence. Public widgets use publishable-key gateway routes. Runtime coordinates conversations, published agent snapshots, knowledge retrieval, subject memory, models, and tool execution. Voice adds speech or realtime sessions around runtime. Events and workers drive workflow execution, ingestion, and lead research.

Service ownership:

| Group | Services and responsibilities |
| --- | --- |
| Access | Identity: users, sessions, organizations, API keys. Workspace: memberships, permissions, invites, publishable keys. Gateway: public routing, authentication, membership checks, rate limiting. |
| Agent execution | Agent: drafts, immutable published versions, tools. Conversation: threads, ordered messages, handoff, outbox. Runtime: turn assembly, retrieval, memory, model/tool orchestration. Model gateway: provider routing, retries, streaming, capacity. |
| Context | Web fetch: acquisition jobs and provider adapters. Knowledge: text storage, queue ingestion, chunking, embeddings, OpenSearch. Memory: subject facts and deletion. Secrets: tool credentials. |
| Operations | Voice: speech/realtime sessions, telephony, call records and capacity. Campaign: audiences and execution coordination. Lead: flexible lead records/schema. Lead generation: durable research, evidence, qualification, campaign delivery. Workflow: event conditions/actions and run traces. |
| Governance | Evaluation: asynchronous per-agent cases/runs and exact-match scoring. Usage: ingestion and ledger reads. Audit: persisted action records and reads. |

Shared packages provide contracts, auth context/JWT helpers, errors, HTTP composition, logging/redaction, tracing, retries/public-web safety, cached membership access, and audit writing. Services generally separate HTTP routes/controllers, business services, and repositories; lead generation concentrates more logic in larger HTTP/store/research modules.

Local infrastructure is PostgreSQL, Valkey, Kafka, OpenSearch, OpenTelemetry Collector, MinIO, and ElasticMQ. Compose is a development data plane; scripts start selected application services. `deploy/`, cloud `infra/`, and `sdk/` still describe future implementation.

## Current product state

“Connected” here means an implementation path exists; it does not certify a successful live acceptance run.

| Area | Evidence-based state |
| --- | --- |
| Login and workspace management | Connected, with organization authorization and cross-organization navigation issues below. |
| Agent configuration/releases/tools | Substantial real implementation; immutable versions and optimistic updates. Agent listing is unpaginated. |
| Inbox and widget chat | Connected conversation/runtime paths, handoff, streaming, and public-key boundaries. Full browser acceptance remains to be run. |
| Knowledge/memory | Real services and text retrieval path. URL crawling, binary document parsing, and inspection capabilities remain incomplete; the ingest worker reads stored bytes as UTF-8. |
| Voice | Real provider factories, cascade/realtime implementations and telephony code exist. Configuration, restart behavior, recording storage and actual carrier behavior need dedicated acceptance/reliability proof. |
| Leads/lead research | Connected UI and durable research jobs, evidence checks, budgets, retries and delivery state. Demo and live are separate modes. Lead identity and pagination have documented limitations. |
| Campaigns/workflows | Connected implementations with bounded initial capabilities. Persisted workflow email/handoff side effects do not by themselves prove actual email delivery or staff handoff. |
| Evaluation | API-backed staff repository exists, contrary to older review/dependency notes. Per-agent cases act as datasets; separate dataset CRUD/revisions and richer scoring remain incomplete. |
| Audit | API-backed repository exists. Detail lookup currently searches a list page, so older entries can incorrectly appear missing. |
| Usage/analytics/billing | Usage ledger exists; analytics data source still returns unavailable. Reporting, quotas and payment integration are separate unfinished work. |
| Notifications/webhook management | Normal repositories explicitly return unavailable; preview stores are separate. |
| Production delivery | Cloud IaC, deploy manifests, CI and SDK are not established by the reviewed tree. Capacity targets are not measured capabilities. |

## Priority findings

1. **Authenticate service identity context.** `packages/auth/src/context.ts` encodes plain JSON as base64url. Agent and other service middleware accept its actor identity before checking a bearer token. A caller reaching such a service port can supply this identity header. Require verified service identity/context, audience and expiry, and strip client context at ingress. Verify direct-port spoof rejection and tenant isolation.

2. **Authorize organization workspace creation.** Gateway organization routes require an access token but no organization membership check. Workspace controller/service/store accept the requested organization ID and create owner membership without authorizing the actor against that organization. Add an authoritative organization permission check and negative tests across organizations.

3. **Fix cross-organization workspace navigation.** `apps/web/src/app/api/workspaces/route.ts` lists workspaces across organizations, but `apps/web/src/lib/server/auth/session.ts` loads only `me.organizations[0]` when opening a workspace. A valid workspace under another organization can redirect to login. Resolve the requested workspace across the user's permitted organizations and verify creation → redirect → reload → switching.

4. **Protect the last owner atomically.** Role update has no last-owner demotion guard. Removal reads owners and deletes separately, allowing concurrent removals to violate the invariant. Enforce this in a database transaction with locking and exercise concurrent operations.

5. **Complete invite redemption/account recovery.** Invite creation/list/deletion exists, but the reviewed workspace routes and member service have no accept/redeem operation. Complete one-time, expiring, email-bound redemption. Password recovery also needs an explicit end-to-end implementation before normal customer onboarding.

6. **Restore a trustworthy check command.** Backend build/typechecks pass, but root lint traverses `.next` and source lint has real errors. Tests fail after socket restrictions are lifted. Establish a reproducible local and CI baseline before broadening features.

7. **Finish one customer journey with acceptance proof.** Recommended first journey: sign in → create/select workspace → configure/publish agent → embed widget → answer from knowledge → take/release in inbox → inspect conversation, usage and audit. Use two organizations and multiple roles. Test provider failure, retries, refresh, duplicate sends, and service restart.

8. **Then complete reporting and operational delivery.** Wire analytics to bounded rollups, add list pagination and reliable detail endpoints, define readiness/draining, private networking, secret injection, migration/rollback procedures, and backup restore. Measure representative capacity before increasing scale claims.

## Verification results

| Check | Result |
| --- | --- |
| `pnpm run integrity` | Passed its known incident-signature scan; this is not a comprehensive security scan. |
| `pnpm run typecheck` | Passed scripts defined by backend/shared workspaces. Web has no `typecheck` script. |
| `pnpm --filter @quickstart/web exec tsc --noEmit` | Passed separately. |
| `pnpm -r --filter './packages/*' --filter './services/*' run build` | Passed. No new Next.js production build was run. |
| `pnpm exec eslint .` | Failed: 13,881 reported errors, heavily inflated by generated `.next` output. |
| `pnpm exec eslint apps/web/src services packages tests --ignore-pattern '**/dist/**'` | Failed: 37 source errors. This narrower check excludes scripts and other root paths. |
| `pnpm test` after rebuilding | Sandbox initially prevented HTTP listeners (`listen EPERM`). Rerun with socket access passed identity tests but failed model gateway's “retries once on fake 429”: returned 429 instead of expected 200. Recursive execution stops on failure, so this does not establish results for all later suites. |

The root `check` command is sequential: integrity → lint → build → typecheck → tests. Because lint fails, a normal full check currently stops before build/test. Tests execute `dist`, so a standalone test invocation can run stale compiled code. Several packages have test commands but no discovered tests; a green exit there is not coverage.

## Planning corrections

The October 12 review remains useful for context but is stale in material places: evaluation and audit adapters now exist, speech and telephony factories select providers, and voice capacity uses Lua for atomic acquisition/idempotent release. Lease expiry and recovery still need proof; atomicity alone does not demonstrate durable concurrency enforcement.

Memory-bank entries and feature dependency documents also mix historical states with current code. Maintain one capability matrix with implementation, persistence, authorization, provider mode, UI connection, acceptance evidence and operational evidence tracked separately.

Recommended next change: a focused workspace/access stabilization pass covering verified identity context, organization authorization, cross-organization navigation, owner invariants and adversarial tests. Follow it with the widget/inbox customer journey and a repaired CI baseline. Avoid further UI expansion until those paths are reliable.
