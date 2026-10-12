# Lead generation service

Backend service for business-profile research, category-based prospect discovery,
evidence-backed qualification and durable campaign ingestion. Integrates with the
existing Quickstar-AI authentication, workspace, model and web-fetch services.

## Scope

- Versioned business profiles with asynchronous website research and explicit separation
  of user-supplied facts from inferred findings.
- Multi-category runs with optional location, company size, contact role, required
  contact method, instructions, exclusions and campaign destination.
- Bounded research rounds, contact/about enrichment, source-quote validation,
  domain deduplication and qualification scores.
- PostgreSQL-backed jobs, leases, heartbeat recovery, fenced writes, bounded retries,
  idempotent requests, cancellation and inspectable failure states.
- Organization-wide budgets and concurrency caps across workspaces, weighted fair
  scheduling, global capacity controls and audited dynamic tier/tenant settings.
- Atomic lead persistence and campaign delivery tasks with independent delivery retry.
- JWT and workspace-role authorization, guarded public fetching, structured logs,
  task spans, queue/run metrics and health/readiness endpoints.

Frontend screens, billing integration, campaign execution and voice calling are
separate components. Commercial daily-run enforcement is disabled initially;
technical limits remain active. Leads are not automatically approved for outreach.

## Architecture

The gateway proxies workspace-scoped lead APIs. The service independently verifies
the access JWT and authoritative workspace permissions/organization. Agent tools
start, inspect or cancel runs using the caller's JWT and fixed workspace context.

PostgreSQL owns jobs and delivery state. Workers use a short global control-row lock
to coordinate claims across replicas, then apply organization caps and scheduling
weights. Provider calls run outside transactions through the existing gateways.
Successful assessments commit accepted leads and delivery jobs together.

Operational policies are re-read before task claims and provider reservations.
Research targeting and business context remain snapshotted per run. Lower concurrency
limits delay new claims; they do not terminate an external request already in flight.

## Code map

| File                                 | Responsibility                                                         |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `src/http.ts`                        | Workspace APIs, admin configuration and authorization                  |
| `src/store.ts`                       | SQL persistence, scheduling, budgets, audit history and delivery state |
| `src/research.ts`                    | Search, bounded enrichment, evidence validation and provider adapters  |
| `src/worker.ts`                      | Task dispatch, heartbeat and failure handling                          |
| `src/config.ts`                      | Environment configuration                                              |
| `src/responses.ts`                   | Bounded response reading and Retry-After parsing                       |
| `src/migrate.ts`                     | Transactional, versioned migration runner                              |
| `migrations/001_lead_generation.sql` | Lead-generation schema and indexes                                     |
| `src/tests/integration.test.ts`      | Workflow, authorization and recovery regressions                       |

## Development

Requirements: Node 22.12+, pnpm 9+, PostgreSQL 16 and Valkey for the existing platform
services. Copy `.env.leads.example` to `.env.leads` and configure local internal
tokens. Both root `.env` and `.env.leads` must be loaded into application processes.
Actual environment files are ignored by Git.

The retained Windows bootstrap installs dependencies, builds backends, starts
development infrastructure and runs migrations:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-lead-generation.ps1
```

For an explicit build and migration from the monorepo root:

```sh
pnpm -r --filter './packages/*' run build
pnpm --filter @quickstart/service-lead-generation build
pnpm --filter @quickstart/service-lead-generation exec node --env-file=../../.env --env-file=../../.env.leads dist/migrate.js
pnpm --filter @quickstart/service-lead-generation exec node --env-file=../../.env --env-file=../../.env.leads dist/index.js
```

Default service port: **3012**. `GET /healthz` reports execution mode; `GET /readyz`
checks database connectivity. Local binding defaults to `127.0.0.1`; private-network
container deployments can explicitly set `LEAD_GENERATION_HOST=0.0.0.0`.

## Execution modes and dependencies

`demo` is an explicit synthetic adapter for development verification. It does not
research real businesses or send real campaign traffic. Profiles, jobs and leads are
mode-scoped. The application defaults to live unless demo is explicitly selected;
the development environment template selects demo.

`live` requires real model/search credentials and model selection. Model gateway
uses port 3008 in the feature template to avoid the frontend's port 3005. Fake
provider responses are rejected. Live campaign ingestion additionally requires
the destination endpoint, token and acknowledgement contract in the API reference.

The platform onboarding caller must invoke `PUT /profile` after collecting business
details. Registration itself is not blocked by website research. Agent tool
definitions are provided in `fixtures/lead-generation-agent-tools.json`; adding
them requires publishing a new agent version.

## Validation

```sh
pnpm --filter @quickstart/service-lead-generation build
pnpm --filter @quickstart/service-lead-generation test
node --env-file=.env --env-file=.env.leads scripts/check-lead-generation.mjs
```

The service suite has **21 passing tests**. Relevant gateway, runtime, acquisition,
agent, contracts and utilities suites bring the verified total to **72**. Shared
packages and all backend services compile; changed code passes lint/style checks.

The cross-service checker passed using actual identity/workspace/gateway/lead service
processes, real Redis and a PGlite socket fixture. It verifies research, three unique
synthetic leads, campaign acknowledgements, request idempotency, audited quota changes
and tenant access restrictions. It creates development accounts/results and refuses
live mode.

SQL tests use PGlite by default. `TEST_DATABASE_URL` switches the service suite to an
isolated development PostgreSQL database and creates/drops unique test schemas.
Embedded and socket fixtures serialize access; these results do not prove normal
PostgreSQL concurrency or throughput. Standalone PostgreSQL, paid provider calls,
the team's campaign endpoint and Windows execution were not validated here.

## Integration requirements

Campaign ownership and idempotent ingestion must be enforced by the campaign service.
Failed handoffs retain accepted leads and support explicit replay. Repeated delivery
of the same lead to the same campaign is deduplicated; campaign updates require a
future versioned update contract.

Current lead identity is one normalized domain per workspace/mode. Independent
branches and multiple person records are not separate identities. Qualification
scores represent an AI fit assessment rather than a calibrated purchase probability.

Deployment still requires normal PostgreSQL concurrency/load verification, provider
quality/budget validation, private admin access, persistent telemetry/alerts and
retention/deletion requirements. The singleton claim lock favors correctness; its
throughput must be measured before scaling to high traffic.

See [API, policy and campaign contracts](../../docs/lead-generation.md).
