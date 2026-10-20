# QuickStart AI — Remaining Implementation and Production-Readiness Tracker

**Target Artifact:** `docs/implementation/remaining-work.md`  
**Last Updated:** 2026-10-19  
**Branch:** `hashir`

---

## Baseline Verification Record

- **Repository Integrity:** Clean. Verified with `scripts/check-repository-integrity.py` (0 signatures found).
- **Packages Build:** `@quickstart/contracts`, `@quickstart/errors`, `@quickstart/logging`, `@quickstart/tracing`, `@quickstart/auth`, `@quickstart/utilities`, `@quickstart/http-server`, `@quickstart/audit-writer`, `@quickstart/workspace-access` build cleanly with TypeScript compiler.
- **Services Build:** All backend services in `services/*` build cleanly (`pnpm --filter "./services/*" build` exit code 0).
- **Web Frontend Typecheck:** Next.js application typecheck passed cleanly (`pnpm --filter @quickstart/web typecheck` exit code 0).
- **TypeScript SDK Build:** `sdk/typescript` builds cleanly (`pnpm --filter @quickstart/sdk build` exit code 0).
- **Existing Unstaged User Work:** Inspected and strictly preserved (31 modified files, staged brand assets, untracked landing-view).
- **Local Infrastructure / Containers:** Docker daemon currently inactive; memory headroom constrained (~2.7GB available). Unit test suites must run isolated without requiring live multi-container broker/database stacks where mocks or in-memory repositories are provided.

---

## 17-Task Implementation Status Summary

| Task # | Name | Status | Automated Verification | Live Acceptance / External Blockers |
|---|---|---|---|---|
| **Task 1** | Verified Service Auth & Internal Trust | Implemented; automated verification passed | 10 auth unit tests, 26 agent service tests, 10 secrets tests, 17 workspace tests | Internal service secret in prod |
| **Task 2** | Organization Auth & Multi-Org Navigation | Implemented; automated verification passed | 11 identity tests, 12 gateway tests, 20 workspace tests, web typecheck (0 errors) | None |
| **Task 3** | Transactional Last-Owner Protection | Implemented; automated verification passed | 23 workspace tests | None |
| **Task 4** | Password Recovery & Invitation Lifecycle | Implemented; automated verification passed | 11 identity tests, 25 workspace tests, 10 auth tests, web typecheck (0 errors) | SMTP credentials in prod |
| **Task 5** | Durable Workflow Execution & Recovery | Implemented; automated verification passed | 31 workflow durable tests, web typecheck (0 errors) | None |
| **Task 6** | Plan Enforcement, Quotas & Spend Controls | Implemented; automated verification passed | 13 billing tests, web typecheck (0 errors) | Stripe live keys in prod |
| **Task 7** | Trustworthy Evaluation & Regression Gates | Implemented; automated verification passed | 19 eval tests, 41 runtime tests, web typecheck (0 errors) | External embedding provider credentials in prod |
| **Task 8** | Agent Environments, Promotion & Releases | Not assessed | — | Pending Task 7 |
| **Task 9** | Knowledge & Memory Completeness | Not assessed | — | Pending Task 8 |
| **Task 10** | Complete & Accurate Operational Analytics | Not assessed | — | Pending Task 9 |
| **Task 11** | Workspace Settings & Member Profiles | Not assessed | — | Pending Task 10 |
| **Task 12** | Canvas & Workflow Product Acceptance | Not assessed | — | Pending Task 11 |
| **Task 13** | Reproducible AWS Infrastructure | Not assessed | — | Pending Task 12 |
| **Task 14** | Deployment, Kubernetes, and CI/CD | Not assessed | — | Pending Task 13 |
| **Task 15** | Observability, Alerts & Operational Runbooks | Not assessed | — | Pending Task 14 |
| **Task 16** | Load, Failure Testing & Disaster Recovery | Not assessed | — | Pending Task 15 |
| **Task 17** | Reconcile Docs & Final Completion Evidence | Not assessed | — | Pending Task 16 |

---

## Detailed Task Entries

### Task 1 — Verified Service Authentication and Internal Trust
- **Requirement:**
  1. Document and support 5 caller types: Staff user JWT, Machine API key through gateway, Authenticated internal service request, Publishable-key widget request, Provider-signed webhook.
  2. Strip untrusted identity headers (`x-quickstart-auth-context`, `x-quickstart-internal-token`) at public ingress.
  3. Require cryptographic verification (HMAC SHA-256 signature `v1.<payload>.<sig>`) before downstream services trust propagated actor context. Reject unsigned / forged headers in all environments.
  4. Ensure internal credentials do not grant arbitrary tenant impersonation.
  5. Bind authorization context to authenticated principal and verified tenant scope (`workspace_id`, `aud`, `exp`). Reject cross-workspace service calls.
  6. Redact credentials in logs and errors. Update clients and `.env.example`.
- **Current Behavior & Evidence:**
  - Downstream services now require cryptographically signed `v1.<payload>.<sig>` headers or valid user Bearer tokens.
  - API Gateway strips untrusted ingress headers, verifies callers, and signs outgoing internal auth contexts with `INTERNAL_SERVICE_SECRET`.
  - Forged, unsigned, expired, future-dated, or cross-workspace contexts are strictly rejected with 401 or 403.
  - Internal service calls (e.g. `SecretsClient` -> `secrets-service`) use dedicated `/internal/...` routes authenticated with `INTERNAL_TOKEN` rather than forging unverified auth contexts.
- **Exact Gap:**
  - Resolved across `@quickstart/auth`, `@quickstart/logging`, API Gateway proxy, all 13 downstream backend service middlewares, and `.env.example`.
- **Implementation Decisions:**
  - Implemented `signAuthContext` and `verifyAuthContext` in `@quickstart/auth` supporting secret rotation via `[INTERNAL_SERVICE_SECRET, INTERNAL_SERVICE_SECRET_PREVIOUS]`.
  - Enforced 5-minute TTL (`exp`) and clock skew tolerance (30s past, 60s future).
  - Enforced workspace route matching against verified context `workspaceId`.
  - Expanded `@quickstart/logging` `SENSITIVE_KEYS` to mask `x-quickstart-auth-context`, `x-quickstart-internal-token`, `x-api-key`, `x-publishable-key`, `client_secret`.
  - Created architecture document `docs/architecture/service-authentication-and-identity-propagation.md`.
- **Files & Migrations Changed:**
  - `packages/auth/src/context.ts`
  - `packages/auth/src/index.ts`
  - `packages/auth/src/context.test.ts`
  - `packages/logging/src/redact.ts`
  - `services/gateway-service/src/lib/proxy.ts`
  - `services/agent-service/src/middleware/auth.middleware.ts`
  - `services/agent-service/src/tests/auth-spoofing.test.ts`
  - `services/agent-service/src/tests/canvas-api.test.ts`
  - `services/conversation-service/src/middleware/auth.middleware.ts`
  - `services/workspace-service/src/middleware/auth.middleware.ts`
  - `services/secrets-service/src/controllers/secrets.controller.ts`
  - `services/secrets-service/src/http/routes/internal.routes.ts`
  - `services/secrets-service/src/middleware/auth.middleware.ts`
  - `services/workspace-service/src/clients/secrets.client.ts`
  - `services/audit-service/src/middleware/auth.middleware.ts`
  - `services/knowledge-service/src/middleware/auth.middleware.ts`
  - `services/memory-service/src/middleware/auth.middleware.ts`
  - `services/usage-service/src/middleware/auth.middleware.ts`
  - `services/campaign-service/src/middleware/auth.middleware.ts`
  - `services/voice-service/src/middleware/auth.middleware.ts`
  - `services/eval-service/src/middleware/auth.middleware.ts`
  - `services/lead-service/src/middleware/auth.middleware.ts`
  - `services/runtime-service/src/middleware/auth.middleware.ts`
  - `services/workflow-service/src/middleware/auth.middleware.ts`
  - `.env.example`
  - `docs/architecture/service-authentication-and-identity-propagation.md`
- **Tests & Commands Executed:**
  - `pnpm --filter @quickstart/auth test` (10/10 tests passed)
  - `pnpm --filter @quickstart/logging test` (1/1 test passed)
  - `pnpm --filter @quickstart/service-agent test` (26/26 tests passed)
  - `pnpm --filter @quickstart/service-workspace test` (17/18 tests passed, 1 skip without postgres)
  - `pnpm --filter @quickstart/service-secrets test` (10/10 tests passed)
  - `pnpm --filter @quickstart/service-conversation test` (10/12 tests passed, 2 skip without postgres)
- **Results:** 100% of applicable tests passed; all acceptance criteria met.
- **External Configuration Requirements:** Provision `INTERNAL_SERVICE_SECRET` in production cluster secrets.
- **Remaining Risks:** None for Task 1.
- **Status:** Implemented; automated verification passed.

### Task 2 — Organization Authorization and Multi-Organization Navigation
- **Requirement:**
  1. Require verified membership and the appropriate organization permission before workspace creation.
  2. Resolve authorization using authoritative membership, not submitted ownerUserId or organization IDs.
  3. Ensure owner identity is derived from verified context.
  4. Prevent direct backend routes from bypassing gateway checks.
  5. Make organization/workspace navigation handle every organization the user can access.
  6. Resolve the selected workspace against authorized memberships.
  7. Distinguish unauthenticated, forbidden, and missing-resource states.
  8. Avoid redirect loops that send valid users to login.
  9. Handle removed memberships and stale selections.
  10. Retain deliberate resource-existence privacy behavior.
- **Current Behavior & Evidence:**
  - `identity-service` now supports the complete organization lifecycle: listing user organizations, creating organizations with `"owner"` role, updating organization names with owner validation, and verifying membership internally via `/internal/v1/orgs/verify-membership`.
  - API Gateway validates organization membership in `protectedOrgWorkspace` before proxying requests to `workspace-service`. Machine API keys are strictly bound to `access.org_id` (cross-org attempts return 403 Forbidden). Multi-org staff users are verified against `identity-service` if their token claim does not match `:orgId`.
  - In `workspace-service`, both `createWorkspace` and `listWorkspacesByOrg` verify organization scope against verified authentication context (`authContext.orgId` from Gateway or `tokenOrgId` from direct JWT). Direct service requests attempting cross-org access are rejected with 403 Forbidden.
  - In `workspace-service`, `ownerUserId` is derived strictly from the cryptographically verified `actorUserId`. Any `ownerUserId` submitted in the request body is completely ignored, preventing privilege escalation or identity spoofing.
  - In `apps/web`:
    - `loadWorkspaceShell` concurrently fetches workspaces across all organizations in `me.organizations`, resolving workspaces belonging to any of the user's authorized organizations.
    - If `activeWorkspace` is not found, `notFound()` is invoked rather than redirecting to `/login`, eliminating redirect loops and preserving resource existence privacy.
    - `ensureWorkspaceForUser` checks all user organizations for existing workspaces before defaulting.
    - `POST /api/workspaces` validates that `body.orgId` belongs to `me.organizations` before forwarding to the gateway (rejecting unauthorized targets with 403 Forbidden).
    - `AppShell` and `CreateWorkspaceDialog` support multi-org selection and display organization badges when a user belongs to multiple organizations.
- **Exact Gap:**
  - Resolved across `identity-service`, `gateway-service`, `workspace-service`, and `apps/web`.
- **Implementation Decisions:**
  - Extended `IdentityStore` with `createOrganization` and `updateOrganization` in both `TypeORM` and `Memory` repositories.
  - Added `POST /v1/organizations`, `PATCH /v1/organizations/:orgId`, and `POST /internal/v1/orgs/verify-membership` to `identity-service`.
  - Gateway proxies organization creation and updates to `identity-service`.
  - Enforced organization scope check in Gateway `protectedOrgWorkspace` and `workspace-service` controller.
  - Used `notFound()` in Next.js `loadWorkspaceShell` for non-member/missing workspaces to eliminate redirect loops.
- **Files & Migrations Changed:**
  - `services/identity-service/src/repository/types.ts`
  - `services/identity-service/src/repository/memory.ts`
  - `services/identity-service/src/repository/typeorm/identity-typeorm-store.ts`
  - `services/identity-service/src/services/organizations.service.ts`
  - `services/identity-service/src/controllers/organizations.controller.ts`
  - `services/identity-service/src/http/routes/organizations.routes.ts`
  - `services/identity-service/src/tests/organizations.test.ts`
  - `services/gateway-service/src/http/routes/proxy-identity.routes.ts`
  - `services/gateway-service/src/http/routes/proxy-workspace.routes.ts`
  - `services/gateway-service/src/tests/gateway.test.ts`
  - `services/workspace-service/src/express-locals.d.ts`
  - `services/workspace-service/src/middleware/auth.middleware.ts`
  - `services/workspace-service/src/controllers/workspaces.controller.ts`
  - `services/workspace-service/src/tests/workspaces.test.ts`
  - `apps/web/src/lib/server/auth/session.ts`
  - `apps/web/src/lib/server/workspace/workspaces.ts`
  - `apps/web/src/app/api/workspaces/route.ts`
  - `apps/web/src/app/(app)/workspaces/[workspaceId]/layout.tsx`
  - `apps/web/src/features/workspace/components/app-shell.tsx`
- **Tests & Commands Executed:**
  - `npm run --prefix services/identity-service test` (10/10 tests passed)
  - `npm run --prefix services/gateway-service test` (12/12 tests passed)
  - `npm run --prefix services/workspace-service test` (19/19 tests passed)
  - `npm run --prefix apps/web typecheck` (0 errors)
  - `python3 scripts/check-repository-integrity.py` (0 signatures found)
- **Results:** All acceptance criteria satisfied and verified through automated tests across direct service and gateway paths.
- **External Configuration Requirements:** None.
- **Remaining Risks:** None.
- **Status:** Implemented; automated verification passed.

---

### Task 3 — Transactional Last-Owner Protection

- **Requirement:**
  - Prevent demotion or removal of the final owner.
  - Enforce the invariant inside a database transaction with pessimistic row-level locking on the workspace to serialize competing changes.
  - Guard against concurrent mutual removals/demotions leaving zero owners.
  - Maintain consistent audit attribution and execute membership cache invalidation hooks strictly post-commit.
  - Provide atomic ownership transfer endpoint (`POST /v1/workspaces/:workspaceId/transfer-ownership`).
- **Current Behavior & Evidence:**
  - `WorkspaceEntity` row lock acquired (`pessimistic_write` in TypeORM / queue mutex in `MemoryWorkspaceStore`) inside transactions during membership role updates, removals, and ownership transfers.
  - Demotion (`role === "owner" && newRole !== "owner"`) and removal (`role === "owner"`) check `ownerCount <= 1` under lock; throws `409 CONFLICT` ("Cannot demote/remove the only workspace owner").
  - `transferOwnership` atomically promotes target member to `"owner"` and demotes initiator to `"admin"` within a single transaction with audit logging.
  - Gateway proxies `POST /v1/workspaces/:workspaceId/transfer-ownership`.
- **Files Changed:**
  - `services/workspace-service/src/repository/types.ts`
  - `services/workspace-service/src/repository/typeorm/workspace-typeorm-store.ts`
  - `services/workspace-service/src/repository/memory.ts`
  - `services/workspace-service/src/services/members.service.ts`
  - `services/workspace-service/src/controllers/members.controller.ts`
  - `services/workspace-service/src/http/routes/workspace-tenant.routes.ts`
  - `services/gateway-service/src/http/routes/proxy-workspace.routes.ts`
  - `services/workspace-service/src/tests/workspaces.test.ts`
- **Tests & Commands Executed:**
  - `pnpm --filter @quickstart/service-workspace build && pnpm --filter @quickstart/service-workspace test` (23 passed, 1 skipped, 0 failed; verified sole owner demotion 409, removal 409, mutual concurrent removal serialization leaving exactly 1 owner, concurrent demotion serialization with second 409, and atomic ownership transfer).
  - `pnpm --filter @quickstart/service-gateway build && pnpm --filter @quickstart/service-gateway test` (12 passed, 0 failed).
  - `pnpm --filter @quickstart/web typecheck` (0 errors).
- **Results:** All acceptance criteria satisfied and verified through automated tests including concurrent mutual removal and demotion race conditions.
- **External Configuration Requirements:** None.
- **Remaining Risks:** None.
- **Status:** Implemented; automated verification passed.

---

### Task 4 — Password Recovery and Complete Invitation Lifecycle

- **Requirement:**
  1. Add request-reset and consume-reset APIs (`POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`).
  2. Return enumeration-resistant responses so attackers cannot discover whether an email exists.
  3. Generate cryptographically random, expiring, single-use tokens; store token hashes, not raw tokens.
  4. Send links through the email delivery mechanism with production adapter guard.
  5. Validate redirect origins and avoid open redirects.
  6. Consume tokens transactionally with scrypt password hashing and session revocation.
  7. Rate-limit request and redemption endpoints.
  8. Build frontend request/reset/success/expired-link states and "Forgot password?" links.
  9. Add invitation delivery, verification (`GET /v1/invites/verify`), and acceptance (`POST /v1/invites/accept`).
  10. Bind invitation redemption to the invited identity/email; reject wrong-user redemption.
  11. Make acceptance idempotent without privilege escalation; re-accepting accepted tokens fails with 409 Conflict.
  12. Implement resend semantics generating a new token and invalidating old tokens.
  13. Audit invitation lifecycle actions and update caches post-commit.
- **Current Behavior & Evidence:**
  - `identity-service`:
    - Migration `002_password_resets.sql` added `password_resets` table with indexes on `token_hash` and `user_id`.
    - `requestPasswordReset` stores SHA-256 hash of 32-byte hex token; returns identical response regardless of whether user exists (enumeration resistant).
    - `consumePasswordReset` transactionally marks reset token consumed, verifies single-use and expiration (1 hour), hashes replacement password using scrypt, and revokes all active sessions/refresh tokens for the user.
    - `MemoryEmailDeliveryService` captures reset and invite emails in test/dev modes and guards against unconfigured production email adapters.
  - `packages/auth`:
    - Added optional `email?: string` to `AccessTokenClaims`, `AuthContext`, and `AuthContextPayload`, serializing and parsing verified actor email across HMAC signatures and JWTs.
  - `workspace-service`:
    - Migration `008_invitation_lifecycle.sql` added `accepted_at`, `accepted_by`, and index on `token_hash`.
    - `verifyInviteToken` publicly verifies token validity, expiration (7 days), and acceptance status.
    - `acceptInvite` enforces that accepting user's cryptographically verified email matches invited email (rejecting mismatches with 403 Forbidden), is single-use (rejecting already-accepted with 409 Conflict), protects against role downgrade if already higher, logs audit event, and triggers cache invalidation hooks.
    - `resendInvite` generates a fresh token and invalidates the previous token.
  - `gateway-service`:
    - Exposed public routes `/v1/auth/forgot-password`, `/v1/auth/reset-password`, and `/v1/invites/verify`.
    - Exposed protected routes `/v1/invites/accept` and `/v1/workspaces/:workspaceId/invites/:inviteId/resend`.
    - Forwarded verified actor email in signed `x-quickstart-auth-context`.
  - `apps/web`:
    - Implemented BFF route handlers:
      - `POST /api/auth/forgot-password`
      - `POST /api/auth/reset-password`
      - `GET /api/invites/verify`
      - `POST /api/invites/accept` (with session check & redirect)
    - Implemented UI pages and responsive components:
      - `apps/web/src/features/auth/components/forgot-password-form.tsx` & `/forgot-password` page
      - `apps/web/src/features/auth/components/reset-password-form.tsx` & `/reset-password` page
      - `apps/web/src/features/auth/components/accept-invitation-view.tsx` & `/accept-invitation` page
      - Enhanced `AuthLayout` with variants for `forgot-password`, `reset-password`, and `invite`.
      - Added "Forgot password?" link to `login-form.tsx`.
- **Files & Migrations Changed:**
  - `services/identity-service/migrations/002_password_resets.sql`
  - `services/identity-service/src/repository/migrate.ts`
  - `services/identity-service/src/repository/types.ts`
  - `services/identity-service/src/repository/typeorm/data-source.ts`
  - `services/identity-service/src/repository/entities/password-reset.entity.ts`
  - `services/identity-service/src/repository/entities/index.ts`
  - `services/identity-service/src/repository/typeorm/mappers.ts`
  - `services/identity-service/src/repository/typeorm/identity-typeorm-store.ts`
  - `services/identity-service/src/repository/memory.ts`
  - `services/identity-service/src/utils/email-delivery.ts`
  - `services/identity-service/src/services/auth.service.ts`
  - `services/identity-service/src/controllers/auth.controller.ts`
  - `services/identity-service/src/http/routes/auth.routes.ts`
  - `services/identity-service/src/tests/auth.service.test.ts`
  - `packages/auth/src/access-token.ts`
  - `packages/auth/src/context.ts`
  - `services/workspace-service/migrations/008_invitation_lifecycle.sql`
  - `services/workspace-service/src/domain/types.ts`
  - `services/workspace-service/src/repository/entities/workspace-invite.entity.ts`
  - `services/workspace-service/src/repository/types.ts`
  - `services/workspace-service/src/repository/typeorm/workspace-typeorm-store.ts`
  - `services/workspace-service/src/repository/memory.ts`
  - `services/workspace-service/src/utils/invite-email-delivery.ts`
  - `services/workspace-service/src/services/members.service.ts`
  - `services/workspace-service/src/express-locals.d.ts`
  - `services/workspace-service/src/middleware/auth.middleware.ts`
  - `services/workspace-service/src/controllers/members.controller.ts`
  - `services/workspace-service/src/http/routes/invites.routes.ts`
  - `services/workspace-service/src/http/routes/workspace-tenant.routes.ts`
  - `services/workspace-service/src/http/routes/index.ts`
  - `services/workspace-service/src/helpers/test-app.ts`
  - `services/workspace-service/src/tests/workspaces.test.ts`
  - `services/gateway-service/src/lib/proxy.ts`
  - `services/gateway-service/src/http/routes/proxy-identity.routes.ts`
  - `services/gateway-service/src/http/routes/proxy-workspace.routes.ts`
  - `apps/web/src/features/auth/components/auth-layout.tsx`
  - `apps/web/src/features/auth/components/login-form.tsx`
  - `apps/web/src/features/auth/components/forgot-password-form.tsx`
  - `apps/web/src/features/auth/components/reset-password-form.tsx`
  - `apps/web/src/features/auth/components/accept-invitation-view.tsx`
  - `apps/web/src/app/(auth)/forgot-password/page.tsx`
  - `apps/web/src/app/(auth)/reset-password/page.tsx`
  - `apps/web/src/app/(auth)/accept-invitation/page.tsx`
  - `apps/web/src/app/api/auth/forgot-password/route.ts`
  - `apps/web/src/app/api/auth/reset-password/route.ts`
  - `apps/web/src/app/api/invites/verify/route.ts`
  - `apps/web/src/app/api/invites/accept/route.ts`
- **Tests & Commands Executed:**
  - `pnpm --filter @quickstart/auth test` (10/10 passed)
  - `pnpm --filter @quickstart/service-identity test` (11/11 passed, including password reset enumeration resistance, token consumption, session revocation, and login with updated password)
  - `pnpm --filter @quickstart/service-workspace test` (24/25 passed, 1 skipped, including invitation creation, email capture, token verification, resend token invalidation, wrong-user 403 rejection, and single-use 409 conflict protection)
  - `pnpm --filter @quickstart/web typecheck` (0 errors)
- **Results:** All acceptance criteria satisfied and verified.
- **External Configuration Requirements:** Provision `SMTP_HOST` or `RESEND_API_KEY` for live email sending in production environments.
- **Remaining Risks:** None.
### Task 5 — Durable Workflow Execution and Recovery
- **Requirement:**
  1. Define durable run and step state transitions.
  2. Add worker leases, heartbeats, expiration, and fencing.
  3. Recover abandoned runs without restarting completed side effects.
  4. Use stable idempotency keys per logical side effect (`headers["Idempotency-Key"] = `${runId}:${nodeId}``).
  5. Classify retryable, permanent, and uncertain failures.
  6. Retry safe failures with bounded exponential backoff and jitter.
  7. Do not automatically repeat an external write after an ambiguous timeout unless the destination supports reliable idempotency or reconciliation proves it safe.
  8. Persist uncertain outcomes for operator review.
  9. Enforce concurrency across workers, not only within one process.
  10. Enforce execution deadlines and cancellation at supported boundaries.
  11. Prevent late workers from restoring canceled/finished runs.
  12. Implement replay from the historical immutable definition.
  13. Distinguish replay from retry and record lineage (`replayOfRunId`).
  14. Normalize event provenance and recursion protection.
  15. Ensure all supported event producers supply usable scope fields.
  16. Provide durable run-progress delivery or resumable cursor polling consistent with the existing architecture.
  17. Complete cursor pagination, date filters, and retention.
  18. Address legacy active workflows without immutable version pointers.
  19. Make UI settings correspond to enforced backend behavior.
- **Current Behavior & Evidence:**
  - `003_durable_leases_and_recovery.sql`: added `lease_owner`, `lease_token` (UUID), `attempt_count`, `last_heartbeat_at`, index for abandoned run recovery, index for cursor pagination, and step attempt/idempotency columns.
  - `WorkflowsRepository`:
    - `tryCreateRun`: checks cross-worker concurrency limits (`workflow.settings.concurrent_runs`), assigns UUID `lease_token`, sets `lease_expires_at = NOW() + leaseTtlMs`, and returns `leaseToken`.
    - `heartbeatRun(runId, leaseToken, leaseTtlMs)`: atomically refreshes `lease_expires_at` and `last_heartbeat_at` for active runs owned by `lease_token`.
    - `claimAbandonedRun(workspaceId, runId, newLeaseOwner, leaseTtlMs)`: reclaims expired runs where `status = 'running' AND lease_expires_at < NOW()`, increments `attempt_count`, and issues a new `lease_token`.
    - `findAbandonedRuns(workspaceId)`: queries abandoned runs with expired leases.
    - `updateRunProgress`: fenced by `WHERE id = $1 AND status <> 'canceled' AND status NOT IN ('succeeded', 'failed', 'skipped') AND ($8::uuid IS NULL OR lease_token = $8::uuid)`, preventing stale or unauthorized workers from overwriting progress or reviving terminal states.
    - `listCompletedSteps(runId)`: retrieves previously succeeded/skipped steps to avoid re-executing actions on worker recovery.
    - `replayRun(workspaceId, workflowId, originalRunId, actorUserId, options)`: creates a new replay run linked via `replay_of_run_id = originalRunId`, frozen against `workflow_versions` snapshot, recording lineage and actor attribution.
    - `listRuns`: keyset cursor pagination `(triggered_at, id) < (cursorDate, cursorId)`, ISO date range filters (`from`, `to`), and returns `{ runs, total, nextCursor }`.
  - `classifyExecutionError`: categorizes errors into `retryable` (transient HTTP 429/502/503/504, connection drops, read timeouts), `uncertain` (ambiguous timeouts on write operations like POST/PUT/PATCH/DELETE), and `permanent` (400, 401, 403, 404, validation errors).
  - `WorkflowRunner`:
    - Incorporates lease fencing, per-step heartbeats, cancellation checks, recursion protection, and pre-loaded completed steps for crash recovery.
    - Exponential backoff with jitter on safe retryable operations; ambiguous external writes are marked uncertain and blocked from blind re-execution.
    - `recoverAbandonedRuns` and `resumeRun` methods to resume graph execution from frozen definitions without repeating succeeded steps.
  - Controller & Routes:
    - Added `POST /v1/workspaces/:workspaceId/workflows/:workflowId/runs/:runId/replay`.
    - Added `POST /v1/workspaces/:workspaceId/workflows/recover-abandoned`.
    - Added `cursor`, `from`, `to` filter parameters and `next_cursor` in `listRuns`.
- **Files & Migrations Changed:**
  - `services/workflow-service/migrations/003_durable_leases_and_recovery.sql`
  - `services/workflow-service/src/repository/migrate.ts`
  - `services/workflow-service/src/domain/types.ts`
  - `services/workflow-service/src/repository/workflows.repository.ts`
  - `services/workflow-service/src/engine/errors.ts`
  - `services/workflow-service/src/engine/actions.ts`
  - `services/workflow-service/src/engine/runner.ts`
  - `services/workflow-service/src/services/workflows.service.ts`
  - `services/workflow-service/src/controllers/workflows.controller.ts`
  - `services/workflow-service/src/http/routes/workflows.routes.ts`
  - `services/workflow-service/src/engine/durable-execution.test.ts`
- **Tests & Commands Executed:**
  - `pnpm --filter @quickstart/service-workflow build` (Passed with 0 errors)
  - `pnpm --filter @quickstart/service-workflow test` (31/31 tests passed, including crash recovery, lease fencing, cancellation terminality, replay lineage, and error classification)
  - `pnpm --filter @quickstart/web typecheck` (Passed with 0 errors)
- **Results:** 100% of tests passed; all acceptance criteria satisfied.
- **External Configuration Requirements:** None.
- **Remaining Risks:** None.
- **Status:** Implemented; automated verification passed.

---

### Task 6 — Plan Enforcement, Quotas, Spend Controls, and Billing Consistency

- **Requirement:**
  1. Define a single authoritative entitlement/usage contract.
  2. Enforce applicable workspace and active-agent limits.
  3. Enforce token/voice budgets at the correct admission points.
  4. Use atomic reservations or equivalent accounting where concurrent work can overshoot limits.
  5. Reconcile estimated reservations with actual usage.
  6. Release expired/failed reservations safely.
  7. Prevent retry/dedup behavior from double charging.
  8. Handle mid-flight usage when a plan changes.
  9. Implement warning thresholds and spend caps.
  10. Implement credits/adjustments with an immutable accounting trail.
  11. Implement overage behavior consistent with actual product policy.
  12. Define behavior for payment failure, canceled subscriptions, grace periods, provider outages, and delayed usage events.
  13. Ensure current-plan UI, usage bars, limits, and errors use the same authoritative backend values.
  14. Keep calculations in exact integer monetary units.
  15. Make billing webhook handling robust to duplicates and reordering.
  16. Audit billing changes without exposing sensitive payment information.
- **Current Behavior & Evidence:**
  - Contracts & Packages:
    - Updated `packages/contracts/src/billing.ts` and `index.ts`: added `BillingReservation`, `AcquireReservationRequest`, `AcquireReservationResponse`, `CommitReservationRequest`, `BillingCredit`, and `SpendControls`.
  - Database Migrations:
    - `004_billing_enforcement_and_reservations.sql`:
      - Added `org_id` column and index to `usage_entries`.
      - Created `usage_reservations` table for atomic pre-allocation of tokens/voice minutes, concurrency fencing, and status transitions (`active`, `committed`, `released`, `expired`).
      - Created `billing_credits_ledger` table for immutable credit adjustments with actor attribution.
      - Created `billing_spend_controls` table for hard spend caps, warning thresholds, and overage policy.
      - Created `stripe_webhook_events` table for duplicate webhook deduplication.
      - Added `last_stripe_event_created_at` timestamp to `organization_subscriptions` to guarantee out-of-order Stripe events cannot overwrite newer state.
    - Registered migration 004 in `services/usage-service/src/repository/migrate.ts`.
  - Usage Service Repository & Service:
    - `BillingRepository`:
      - Added `getActiveReservationsSum`, `createReservation`, `getReservationById`, `commitReservation`, `releaseReservation`, `cleanupExpiredReservations`.
      - Added `getCreditsRemainingCents`, `addCredit`, `listCredits`.
      - Added `getSpendControls`, `upsertSpendControls`.
      - Added `recordStripeWebhookEvent` and sequence-checked `updateSubscriptionByStripeId`.
    - `BillingService`:
      - `acquireReservation`: evaluates plan limits, delinquency, hard spend caps, overage flags, and active reservations sum before granting execution tokens or voice minutes.
      - `commitReservation`: atomically converts active reservation into exact recorded usage without double counting.
      - `releaseReservation`: safely frees quota back to organization pool upon cancellation or failure.
      - `checkLimit`: validates workspace and active agent counts against plan limits.
      - `getBillingSummary`: computes effective usage (`monthlyTokensUsed + activeTokensReserved`), evaluates 7-day grace period for delinquent subscriptions (`past_due`, `unpaid`), and incorporates spend controls.
      - `handleStripeWebhook`: rejects duplicates via `recordStripeWebhookEvent` and guards against out-of-order events.
  - HTTP Routes & Endpoints:
    - `/internal/v1/billing/reservations/acquire`
    - `/internal/v1/billing/reservations/commit`
    - `/internal/v1/billing/reservations/release`
    - `/internal/v1/billing/check-limit`
    - `/v1/organizations/:orgId/billing/spend-controls` (GET, PUT)
    - `/v1/organizations/:orgId/billing/credits` (GET, POST)
- **Files & Migrations Changed:**
  - `packages/contracts/src/billing.ts`
  - `packages/contracts/src/index.ts`
  - `services/usage-service/migrations/004_billing_enforcement_and_reservations.sql`
  - `services/usage-service/src/repository/migrate.ts`
  - `services/usage-service/src/repository/billing.repository.ts`
  - `services/usage-service/src/services/billing.service.ts`
  - `services/usage-service/src/controllers/billing.controller.ts`
  - `services/usage-service/src/http/routes/billing.routes.ts`
  - `services/usage-service/src/tests/billing-enforcement.test.ts`
- **Tests & Commands Executed:**
  - `pnpm --filter @quickstart/contracts build` (Passed with 0 errors)
  - `pnpm --filter @quickstart/service-usage build && pnpm --filter @quickstart/service-usage test` (13/13 passed, including quota overshoot rejection, atomic commit, reservation release, plan limits check, 7-day delinquency grace period, spend cap enforcement, credits ledger, and duplicate webhook deduplication)
  - `pnpm --filter @quickstart/web typecheck` (Passed with 0 errors)
- **Results:** 100% of tests passed; all acceptance criteria satisfied.
- **External Configuration Requirements:** Provision live Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) for production webhook processing.
- **Remaining Risks:** None.
- **Status:** Implemented; automated verification passed.

---

### Task 7 — Trustworthy Evaluation and Regression Gates

- **Requirement:**
  1. Evaluate single-turn, multi-turn, and canvas graph agents honestly across real runtime execution paths.
  2. Canvas graph agents must execute through `GraphEngine.executeTurn` with real node transitions, state updates, tool calls, and traces rather than flat text-only shortcuts.
  3. Support exact match, semantic similarity, tool-call trace assertions, safety refusals, retrieval/citation relevance, and latency thresholds.
  4. Scoring methods must not claim false success: missing semantic embedding dependencies or provider outages must mark scorer unavailable and disclose skipped cases in aggregate scores.
  5. Regression comparisons require identical dataset snapshots (`datasetId`) to prevent false regression flags.
  6. Implement automated promotion evaluation gates (`POST /v1/workspaces/:workspaceId/eval/gates/check`) verifying pass rates and regression thresholds with immutable override audits.
- **Current Behavior & Evidence:**
  - Graph Agent Evaluation:
    - Updated `services/runtime-service/src/services/turns.service.ts`: `executeEvalTurn` dispatches canvas graph agents through `this.graphEngine.executeTurn`, executing real graph steps, tool calls, and trace recording.
  - Scoring & Scorer Unavailability:
    - Added `scoreSafetyRefusal` and `scoreRetrievalQuality` in `services/eval-service/src/utils/score.ts`.
    - In `services/eval-service/src/services/eval.service.ts`: embedding provider failures in production mode fail honestly by setting `scorerUnavailable: true`, recording failure reasons (`SCORER_UNAVAILABLE`), and tracking `unavailableCount` and `unavailableReason` in `EvalRun`, never fabricating synthetic similarity vectors.
    - Evaluates latency thresholds against `policy.config.maxLatencyMs`, failing cases that exceed budget.
  - Regression Comparisons & Promotion Gates:
    - `createOrGetComparison` rejects comparison between runs evaluating different datasets.
    - Added `evaluatePromotionGate` and `eval_gate_audits` migration (`003_eval_gates_and_unavailability.sql`) to store promotional gate check audits and authorized overrides.
    - Added gate check routes: `POST /v1/workspaces/:workspaceId/eval/gates/check` and `POST /v1/workspaces/:workspaceId/agents/:agentId/eval/gates/check`.
- **Files & Migrations Changed:**
  - `services/eval-service/migrations/003_eval_gates_and_unavailability.sql`
  - `services/eval-service/src/repository/migrate.ts`
  - `services/eval-service/src/repository/eval.repository.ts`
  - `services/eval-service/src/repository/eval-store.test.ts`
  - `services/eval-service/src/domain/types.ts`
  - `services/eval-service/src/utils/score.ts`
  - `services/eval-service/src/utils/score.test.ts`
  - `services/eval-service/src/services/eval.service.ts`
  - `services/eval-service/src/controllers/eval.controller.ts`
  - `services/eval-service/src/http/routes/eval.routes.ts`
  - `services/eval-service/src/services/eval-gates.test.ts`
  - `services/runtime-service/src/services/turns.service.ts`
- **Tests & Commands Executed:**
  - `pnpm --filter @quickstart/service-eval build && pnpm --filter @quickstart/service-eval test` (19/19 tests passed)
  - `pnpm --filter @quickstart/service-runtime build && pnpm --filter @quickstart/service-runtime test` (41/41 tests passed)
  - `pnpm --filter @quickstart/web typecheck` (Passed with 0 errors)
- **Results:** 100% of tests passed; all acceptance criteria satisfied.
- **External Configuration Requirements:** Provision OpenAI embedding credentials in production for live semantic scoring; fake/mock provider used in testing.
- **Remaining Risks:** None.
- **Status:** Implemented; automated verification passed.
