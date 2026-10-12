# QuickStart AI codebase review

**Review date:** 2026-10-12  
**Repository:** `quickstar-ai`  
**Review type:** Static code, architecture, product completeness, security, reliability, and operations review.  
**Execution:** Read source, tests, roadmap, ADRs, and deployment/docs. No files besides this report were changed. Tests/builds/load tests were not run; conclusions about runtime behavior are marked as code-level risks unless independently established in source.

## Executive summary

This is a substantial and thoughtfully documented learning platform foundation with real implementations for identity, tenancy/RBAC, agents and publishing, conversations, model routing, web acquisition, knowledge ingest/retrieval, memory, tools/secrets, workflows, voice/campaigns, leads, and a staff UI. The strongest engineering choices are explicit tenant context, service-specific persistence, shared contracts, migration discipline, idempotency work, a membership cache, and a roadmap that names known unsafe areas.

It is **not yet a production-ready multi-tenant AI platform at the stated scale**. The repository’s own roadmap marks production voice integrations, billing, evaluations, audit, observability/alerts, cloud deployment, CI, and load/failure proof as unfinished. Several staff screens are preview-only or use repositories that always return unavailable. The most material code-level concern found in this pass is that voice capacity accounting uses expiring Redis counters with non-atomic multi-key updates and best-effort release; this cannot provide a durable concurrency bound across long calls, Redis failures, or process restarts.

The product and architecture documentation also has contradictory levels of truth: the roadmap carefully qualifies scale as a target and labels unfinished features, while `docs/CLAUDE_PROJECT_BRIEF.md` describes aspirational security, sandboxing, and scale properties as current platform characteristics. That document should not be treated as an implementation reference until reconciled.

### Overall assessment

| Area | Assessment |
| --- | --- |
| Core backend foundation | Good breadth and clear service ownership; production readiness varies by service. |
| Product completeness | Several live core journeys; substantial roadmap gaps and preview-only areas remain. |
| Tenant/security posture | Good patterns in several services, but require further adversarial cross-service and production-boundary proof. |
| Reliability/scale | Explicit target architecture and local foundations; no deployment, load, recovery, or CI proof yet. |
| Maintainability/docs | Many useful ADRs and learning docs; some canonical docs are stale or aspirational. |

## Findings

Severity reflects potential customer or engineering impact, not how much code is involved.

### Critical — Workspace services trust an unsigned, caller-forgeable identity header

[`packages/auth/src/context.ts`](../../packages/auth/src/context.ts:28) serializes the gateway context as plain base64url JSON, and `parseAuthContextHeader()` only decodes and checks field types (lines 38–61); there is no signature, MAC, or token verification. Service middleware gives this header precedence over a verified bearer JWT: [`services/agent-service/src/middleware/auth.middleware.ts`](../../services/agent-service/src/middleware/auth.middleware.ts:10) accepts any parsed `actorId` and continues (lines 10–14), with the same pattern in workspace service. The services listen on `0.0.0.0` in their startup paths. Thus, wherever a caller can reach a service port, it can construct a header naming another actor and then rely on that identity for downstream permission checks. The intended “internal-only” boundary is not enforced by the current deployment tree, and there are no deployment manifests to establish private network isolation.

**Impact:** direct service access can bypass authentication as any chosen user and may enable cross-tenant access depending on service authorization checks. This is the highest-priority security finding.  
**Recommended action:** do not treat the context header as proof of identity. Sign it with a short-lived MAC/JWT and verify audience/expiry at every service, or require authenticated service-to-service transport and only accept gateway context over that channel. Strip any client-supplied context at the gateway. Add direct-port spoofing and cross-workspace tests; enforce private service networking in deployment.

### High — Workspace creation does not authorize the URL organization

[`services/workspace-service/src/http/routes/org-workspaces.routes.ts`](../../services/workspace-service/src/http/routes/org-workspaces.routes.ts:12) protects organization workspace creation with authentication only (lines 12–16), despite the route comment promising organization membership authorization. The controller accepts `orgId` from the path and calls `createWorkspace()` with that value and the current actor as owner ([`workspaces.controller.ts`](../../services/workspace-service/src/controllers/workspaces.controller.ts:8), lines 11 and 21–27). It does not check organization membership or that the actor belongs to that organization. Any authenticated account can therefore attempt to create a workspace under another organization's ID.

**Impact:** unauthorized organization pollution and possible downstream ownership/billing inconsistencies.  
**Recommended action:** validate organization existence and require an appropriate organization role before creation; test user A creating/listing under organization B.

### High — Workspace invites can be created but not accepted

`MembersService.createInvite()` creates a hashed one-week token and returns the raw token ([`services/workspace-service/src/services/members.service.ts`](../../services/workspace-service/src/services/members.service.ts:74), lines 93–105), but there is no accept/redeem route or service method in the workspace service or staff BFF. The invite flow has no way to establish membership, mark a token consumed, or enforce its intended email/expiry at redemption.

**Impact:** the team invitation feature cannot complete its core job.  
**Recommended action:** implement atomic, one-time redemption tied to authenticated email and expiry, with replay protection and role checks, then expose the flow through the web UI and verify it end to end.

### High — Workspace ownership invariant can be violated under concurrency and demotion

`MembersService.removeMember()` checks the owner count and later deletes in separate operations ([`services/workspace-service/src/services/members.service.ts`](../../services/workspace-service/src/services/members.service.ts:50), lines 59–70). Concurrent removal of two owners can both observe more than one owner and remove both. The role update path has no last-owner guard before changing a role (lines 33–47). The TypeORM repository also performs standalone writes without a transaction/lock, and role updates have no optimistic version check.

**Impact:** a workspace can be left without an owner; concurrent admin edits silently overwrite one another.  
**Recommended action:** enforce owner count and role changes inside a database transaction with row/advisory locks or a constraint-backed design; add concurrency tests and version checks for role edits.

### High — Voice Redis counters can stop enforcing concurrency limits

[`services/voice-service/src/caps/call-caps.ts`](../../services/voice-service/src/caps/call-caps.ts:25) increments global and workspace counters in separate Redis operations, and sets a fixed two-hour expiry only on first increment (lines 34–45). A call lasting beyond the TTL can outlive its counter; a new call then sees a reset count and can exceed the configured cap. If Redis fails after incrementing the global counter but before the workspace increment, the global slot is leaked. `release()` decrements each key separately and suppresses failures (lines 62–70), so lost releases permanently distort counts until TTL expiry; duplicate release can also decrement below zero and reset a key while other calls remain active.

**Impact:** configured limits (including the stated 5,000 inbound + 5,000 outbound design target) are not reliable admission controls.  
**Recommended action:** replace counters with an atomic Redis Lua operation or another lease model that acquires both dimensions transactionally, records per-call ownership, makes release idempotent, and handles long-lived leases/renewal and stale-call reconciliation. Add failure-injection tests before claiming a hard cap.

### High — Agent builder is missing core configuration and exposes non-authoritative catalogs

[`apps/web/src/features/agents/components/agent-editor.tsx`](../../apps/web/src/features/agents/components/agent-editor.tsx:46) only offers identity, instructions, model, tools, and versions tabs. It has no Knowledge, Memory, or Guardrails configuration despite those being required in the F2 product spec; users cannot manage source attachment or memory subject behavior from the builder. It also hardcodes tool names such as `process_refund` and `send_followup_email` and model IDs such as `claude-3-5-sonnet` (lines 48–76), rather than deriving capabilities from configured providers and registered tools. Tool selection has no permission policy controls.

**Impact:** users can publish configurations that appear supported but have no executable backend integration, and several central agent capabilities cannot be configured in product.  
**Recommended action:** make the backend the source of truth for available models/tools and per-tool permissions, and implement the missing builder settings before considering F2 fully complete.

### High — Agent list is unbounded and has no archive workflow

[`apps/web/src/app/(app)/workspaces/[workspaceId]/agents/page.tsx`](../../apps/web/src/app/(app)/workspaces/%5BworkspaceId%5D/agents/page.tsx:13) makes one request for the entire agents array and passes it to the client (lines 13–22); the list only filters this loaded array. There is no cursor/load-more or archive filter/management flow, despite the design target of 100,000 agents and F2's pagination/archive criteria.

**Impact:** large workspaces can produce oversized responses and a degraded or unusable management screen; archived agents may become hard to discover/manage.  
**Recommended action:** add cursor pagination at service, gateway, BFF, and UI levels, plus archive state and filters.

### Medium — Conflict resolution discards the user's local edits

When optimistic concurrency returns 409, the agent editor's conflict action reloads the server version and overwrites form state ([`apps/web/src/features/agents/components/agent-editor.tsx`](../../apps/web/src/features/agents/components/agent-editor.tsx:197), lines 197–219). `ConflictBanner` provides only the reload action. The roadmap calls for showing a diff and letting the editor decide how to reconcile; as implemented, a user can lose unsaved work.

**Recommended action:** preserve the local draft and offer compare/reapply or merge before replacing it.

### Medium — No account recovery flow is present

The app contains login/register and login/refresh/logout API handlers, but no forgot-password or reset-password UI/API/service flow. The roadmap's F1 definition includes password reset. This is a significant account recovery and support gap for a real SaaS product.

**Recommended action:** implement expiring, single-use recovery tokens, generic responses to prevent account enumeration, rate limits, and session revocation after password reset.

### Medium — Widget dialog does not implement complete modal keyboard/accessibility behavior

The public widget uses dialog semantics but does not mark the dialog modal, move/manage focus as a modal, trap keyboard focus, restore focus to the launcher, or close on Escape. Its launcher retains the label “Open chat” while expanded. This makes the key external customer surface difficult to operate with keyboard and assistive technology.

**Recommended action:** implement the full dialog keyboard/focus lifecycle and expose expanded state and context-appropriate launcher labeling.

### Low — Widget requests have no deadline or abort handling

[`apps/web/public/quickstart-widget.js`](../../apps/web/public/quickstart-widget.js:129) uses bare `fetch()` for startup and turn requests. If the gateway stalls, initialization or sending can remain pending and the input stays unavailable. The implementation already retains an idempotency key on same-text retries; add request deadlines and error/retry UI while preserving that behavior.

### High — Voice starts with fake speech and CPaaS in the normal server composition

[`services/voice-service/src/index.ts`](../../services/voice-service/src/index.ts:42) wires `createFakeSpeechBundle()` (line 44), `FakeCpaasProvider("twilio")` and `FakeCpaasProvider("telnyx")` (lines 70–71), plus a fake provider. `SipBridgeProvider` is separately registered. This is appropriate for local/demo development, but the normal `startVoiceServer()` does not select implementations based on environment or reject fake providers in production.

**Impact:** a deployment can appear healthy while real STT/TTS and carrier interactions are simulated. This conflicts with a production voice feature and the project's specified concurrent call goals.  
**Recommended action:** make provider selection explicit and environment-gated, fail startup in production for fake adapters, and distinguish simulated call routes from live routes in readiness and deployment configuration. Complete provider authentication, signature validation, media transport, interruption, transfer, and call recovery before enabling real traffic.

### High — Multiple advertised staff features have no production backend

The production adapters explicitly return unavailable for core user operations:

- Evaluation datasets, runs, imports, and execution: [`apps/web/src/features/evaluation/lib/repository.ts`](../../apps/web/src/features/evaluation/lib/repository.ts:12) (all methods through line 80).
- Webhook registration, delivery history, and redrive: [`apps/web/src/features/developer/lib/repository.ts`](../../apps/web/src/features/developer/lib/repository.ts:9).
- Analytics: [`apps/web/src/features/analytics/lib/data-source.ts`](../../apps/web/src/features/analytics/lib/data-source.ts:4).
- Audit entries: [`apps/web/src/features/audit/lib/repository.ts`](../../apps/web/src/features/audit/lib/repository.ts:1).

The preview stores/fixtures make these screens explorable but do not persist business data. The roadmap marks Features 25–28 (evaluation, usage/billing, audit/security, observability/alerts) not started at [`docs/roadmap.md`](../../docs/roadmap.md:309). In particular the UI should not be counted as a shipped capability without a connected production adapter.

**Impact:** users cannot actually perform these workflows in a normal workspace; screenshots and route presence overstate product capability.  
**Recommended action:** publish a feature-state matrix (live / partial / preview / unavailable) and finish service + gateway + BFF + UI together, or clearly gate unfinished screens as preview. Prioritize audit and usage facts before production customer traffic.

### High — Product scope does not yet meet its stated production operating model

There are no checked-in deployment manifests or CI workflows in the reviewed tree; [`deploy/README.md`](../../deploy/README.md:1) says Helm/configs will come later. The roadmap marks cloud deploy/CI and load/failure/recovery features 29–30 and P1–P8 not started ([`docs/roadmap.md`](../../docs/roadmap.md:313)). [`tests/README.md`](../../tests/README.md:1) says cross-service, e2e, load, security, and failure tests are future work. `docker-compose.yml` is a local data plane rather than an all-services stack. Therefore there is no repository evidence for production rollout, capacity, disaster recovery, or multi-replica behavior at 10k RPS / 10k chats / 10k calls.

**Impact:** operational claims are targets rather than demonstrated properties; a production launch would lack the run/deploy/rollback and recovery proof expected by the project brief.  
**Recommended action:** define a deployable minimum (CI, image build, secrets/config handling, network boundaries, migrations, health/readiness, drain, metrics/alerts, backup/restore) and then add representative load/failure gates. Do not convert target scale to a capability claim until measured.

### High — Aspirational security/scale brief is presented as current behavior

[`docs/CLAUDE_PROJECT_BRIEF.md`](../../docs/CLAUDE_PROJECT_BRIEF.md:23) calls the platform “enterprise-grade” and describes 10k RPS and zero-trust/sub-ms authorization as target performance (lines 27–31). It describes isolated Docker micro-sandboxes with egress restrictions, zero-downtime key rotation, semantic memory, and other properties as current platform differentiators (lines 39–46, 159–177), while the roadmap separately marks deployment, security, and scale proof unfinished. The service tree's runtime currently includes tool execution and an MCP runner, but this brief's sandbox claims need explicit implementation evidence and should not be assumed from the presence of tool calling.

**Impact:** internal teams and external readers can mistake desired properties for verified controls.  
**Recommended action:** mark this brief as aspirational or rewrite it against current code; link each security/scale assertion to implementation and a test or operational artifact.

### Medium — Current feature/status records contradict each other

The roadmap's main status table says voice path, speech providers, telephony, campaigns, and leads are not started ([`docs/roadmap.md`](../../docs/roadmap.md:302)), while the repository contains `voice-service`, `campaign-service`, `lead-service`, corresponding staff pages, and a row in the earlier “already built” summary that says voice and campaigns are present. The code includes fake speech and fake CPaaS adapters, so “code exists” and “feature complete” are materially different states.

**Impact:** planning, review, and user expectations can diverge; feature ownership/dependency decisions may be based on a false completion signal.  
**Recommended action:** define status meanings once and sync each product feature against acceptance criteria: implemented code, live provider, persistence, authorization, gateway exposure, UI flow, operational proof.

### Medium — Canonical OpenAPI document is not a contract for the shipped API

[`docs/api/openapi.yaml`](../../docs/api/openapi.yaml:1) contains only a small selection of paths and no request/response schemas. It omits most implemented gateway routes (agents, conversations, knowledge, memory, secrets, workflows, voice, campaigns, leads) and references bearer auth only on a few operations. Meanwhile the developer portal parses this document. It cannot currently generate accurate client documentation or guard gateway changes against contract drift.

**Recommended action:** expand OpenAPI from actual public gateway routes, include schemas/errors/auth and publishable-key cases, then add contract validation or generated route checks.

### Medium — Current persistence patterns do not yet prove the stated horizontal scale

The roadmap itself calls for a written Postgres connection budget and pooler before production load if replica math exceeds `max_connections`, and says voice should be separate from the HTTP gateway ([`docs/roadmap.md`](../../docs/roadmap.md), scale rules and “still unsafe” section). There is no checked-in pooler/deployment design or production capacity evidence. Some resource limits are explicitly in-process (`createMemoryInflightCap`, `createMemoryDailyUnitBudget`, test/demo stores), so every runtime path needs verification that production composition uses distributed/durable implementations.

**Impact:** adding replicas may multiply database/vendor connections and can reset process-local limits or lose in-flight job state.  
**Recommended action:** inventory every `Map`/memory adapter used by production composition, calculate pool totals against Postgres, and move admission/budgets/job ownership to shared stores where the invariant spans replicas.

### Medium — The gateway proxy buffers complete upstream responses

[`services/gateway-service/src/lib/proxy.ts`](../../services/gateway-service/src/lib/proxy.ts:64) uses `fetchWithPolicy`, then reads the entire body with `await upstream.text()` before sending it (lines 71–78). This is suitable for ordinary bounded JSON responses but prevents transparent streaming and uses memory proportional to response size. The README/product descriptions include streaming agent conversations; the gateway proxy path should be checked against that intended contract.

**Impact:** SSE/token streaming cannot be delivered with first-token latency through this helper; large responses can increase memory and latency under load.  
**Recommended action:** implement a streaming proxy path with cancellation/backpressure and header policy where streaming is required; set response size limits for buffered JSON routes.

### Medium — API gateway membership check is not universal by design

The roadmap explicitly says the gateway validates the token but does not check the URL workspace membership; the owning service must enforce it (see `docs/roadmap.md`, “What is still unsafe in the code we already shipped”). This can be a sound layered design, but increases the importance of verifying every workspace-owned route has service-side permission enforcement and every internal route is inaccessible from untrusted networks. The route catalog and internal/public distinction are not yet a complete OpenAPI or deployment network policy.

**Impact:** any missed route middleware or exposed internal listener could become an IDOR or trust-boundary bypass.  
**Recommended action:** automated route inventory that asserts auth + tenant + permission policy, and production network controls that make internal routes private; add cross-service IDOR coverage for every workspace resource.

### Medium — Tool execution, SSRF, and secret handling need production-grade boundary proof

The runtime dispatches tools and MCP calls; workflow actions include URL-fetch behavior with an SSRF test suite. The aspirational brief describes isolated tool sandboxes and egress restriction, but this review found no evidence that generic tool execution runs in an isolated container with enforceable network egress policy. A passing URL validator alone does not protect redirects, DNS rebinding, alternate IP encodings, or all downstream clients unless resolution and connection are bound. Secrets are a separate service, but tool-boundary exposure and redaction need end-to-end proof.

**Impact:** user-configured tools and workflow HTTP actions are a high-risk path to internal services, metadata endpoints, and credential exposure if controls are only application-level.  
**Recommended action:** document each tool type's execution boundary; enforce destination policy at connection time and across redirects; run arbitrary code in a separate sandbox if supported; add adversarial integration tests and secret/log-leak tests.

### Medium — Local data plane is not an end-to-end developer environment

The root README advertises `make up` for the data plane and `pnpm check`, but the Compose stack is local infrastructure only. Service startup and migrations remain separate/manual, and there is no single command to bring up all product services with dependency ordering. This raises setup drift and makes integrated user journeys harder to reproduce.

**Recommended action:** provide an explicitly supported local profile/script for the minimal end-to-end path (identity → workspace → agent publish → widget/runtime → conversation), ordered migrations, health checks, and teardown. Keep optional heavyweight services profile-gated.

### Low — Architecture documentation index is incomplete and service inventory is stale

[`docs/architecture/README.md`](../../docs/architecture/README.md) remains a placeholder, while `docs/CLAUDE_PROJECT_BRIEF.md` describes 11 services but the current repository has substantially more (gateway, workflow, voice, campaign, lead added). The richer ADRs are useful, but there is no canonical current service map and dependency inventory.

**Recommended action:** maintain a generated service/port/owner/storage/public-route matrix and link it from architecture index and root README.

## Product-level completeness map

This is a code/documentation assessment, not acceptance testing.

| Capability | Assessment from repo evidence | Main gap |
| --- | --- | --- |
| Identity and organization/workspace basics | Implemented services and UI paths exist | Production threat hardening and full integrated verification still needed. |
| Workspace tenancy/RBAC | Shared auth context, membership service/cache, tenant-aware services exist | Need complete route-policy and internal-network proof. |
| Agent CRUD, versions, publish | Backend and UI are present | Ensure the full builder/tool/secret journey aligns with current product requirements. |
| Conversations and handoff | Persistent service and inbox UI exist | Roadmap notes no SSE/list cursor; verify list pagination and realtime behavior. |
| Model gateway | Provider abstraction and tests exist | Production rate/cost controls and scale evidence remain. |
| Web fetch and knowledge | Acquisition, queueing, ingestion/retrieval code exists | Verify durable limits, SSRF behavior in network path, retention/deletion and provider readiness. |
| Memory | Durable service and UI exist | Roadmap notes auto-extraction/vector memory absent; semantics should be described accurately. |
| Tools / MCP / secrets | Backend path exists | Sandbox and egress isolation are not established by source reviewed. |
| Widget | Marked partial in roadmap | Roadmap says rendered browser check remains; validate production key/origin and streaming/retry behavior. |
| Workflow automation | Service, event consumer and UI exist | Need event consumer idempotency and durable operations proof; inspect delayed retry/DLQ/replay semantics before production. |
| Voice / campaigns | Extensive code surface exists | Fake speech/CPaaS are wired in server; roadmap says underlying features are not started. |
| Leads | Service and UI code exist | Roadmap still marks feature not started; verify capture/consent/source attribution, retention and live UI path. |
| Analytics / evaluation / webhooks / audit | UI designs exist | Production data repositories are unavailable or preview-only. |
| Usage and billing | Roadmap not started | No usage ledger/billing acceptance path. |
| Audit / observability / alerts | Roadmap not started | Traces/logging foundation exists, but no complete audit trail/alerts/SLO evidence. |
| SDKs / production deployment | Not complete | No production deploy or generated SDK contract proof. |

## Suggested order of work

1. **Establish truthful product state:** reconcile the roadmap, README, project brief, and actual provider/runtime configurations; mark preview and fake paths visibly.
2. **Fix voice admission accounting before real traffic:** atomic ownership-based leases and recovery, then idempotent call lifecycle and drain tests.
3. **Close the public product-critical service gaps:** audit/usage facts, then evaluation and webhook infrastructure, with gateway/BFF/UI wired end to end.
4. **Prove tenant boundaries:** generate a route policy inventory and test cross-workspace access for every resource and internal route.
5. **Ship production plumbing:** CI, deploy manifests, secret injection, migrations, connection budgets/pooler decision, readiness/drain, backup/restore, metrics/alerts.
6. **Validate target claims:** cross-service integration, security, fault-injection and realistic load tests; publish measured results and limits.
7. **Make contracts authoritative:** OpenAPI parity plus client/SDK generation or validation.

## Review limits and repository state

- Static inspection only. No test, build, linter, dynamic security scan, provider call, or load test was run as part of this review.
- This is a broad repository pass, not a formal penetration test, database migration audit, or a line-by-line review of every repository path. Detailed code review focused on high-risk representative paths and cross-checked project documents; see feature and architecture gaps above.
- The working tree had pre-existing untracked `.pnpm-store/` and several learning guide files. They were not modified or included in this report’s claims.
- The repository contains `docs/security/repository-incident-2026-10-10.md`, which documents a prior malicious-branch incident and recovery. That incident report is part of current project context; this pass did not conduct workstation, credential, remote-ref, CI-history, or endpoint forensics and therefore makes no claim about present credential safety.
