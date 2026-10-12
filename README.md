# QuickStart AI

Production-scale, multi-tenant AI agent platform — rebuilt incrementally on the [60-day roadmap](docs/roadmap.md).

## Documentation

- **What we are building:** [docs/project_details.md](docs/project_details.md)
- **Execution plan:** [docs/roadmap.md](docs/roadmap.md)
- **Learn-day depth (Deep learning, database, APIs, identity):** [docs/ai-roadmap.md](docs/ai-roadmap.md)
- **Architecture decisions:** [docs/adr/](docs/adr/)

## Repository layout

```text
services/     Deployable domain services (copy services/_template to add one)
packages/     Shared libraries (contracts, errors, logging, tracing, auth, utilities)
sdk/          Client SDKs (later)
infra/        Terraform (later)
deploy/       Helm / environment configs (later)
tests/        Cross-service tests (later)
docs/         Product spec, roadmap, ADRs, runbooks
```

**Slot 01:** monorepo scaffold and `services/_template` with `GET /healthz` only.

**Slot 02:** local data plane via Docker Compose (Postgres, Valkey, Kafka, OpenSearch, OTel, SQS-compatible queue). See [local data plane](docs/architecture/local-data-plane.md).

**Slot 03:** shared platform libraries (`@quickstart/errors`, `logging`, `tracing`, `auth`, `utilities`) wired into `services/_template`.

**Slot 04:** `services/identity-service` — register/login/refresh, organizations, org API keys. Run **`make identity-migrate`** before starting the service. See [ADR 0004](docs/adr/0004-identity.md), [database migrations](docs/architecture/database-migrations.md), and [services/identity-service/README.md](services/identity-service/README.md).

**Slot 05–06:** `services/workspace-service` (tenancy, RBAC) and `services/gateway-service` (public API proxy). See [ADR 0005](docs/adr/0005-tenancy-and-rbac.md), [ADR 0006](docs/adr/0006-api-gateway.md), [docs/api](docs/api/README.md), and [gateway testing](services/gateway-service/TESTING.md).

**Slot 07:** `services/agent-service` — workspace-scoped agent configuration (CRUD, optimistic concurrency). Run **`make agent-migrate`**. See [ADR 0007](docs/adr/0007-agent-aggregate.md) and [services/agent-service/README.md](services/agent-service/README.md).

## Prerequisites

- Node.js **22+**
- [pnpm](https://pnpm.io/) **9+**
- **Docker Compose v2** for the local data plane
- **AWS CLI** for the Slot 02 smoke test (SQS API against ElasticMQ)

## Setup

```bash
pnpm install
pnpm check
```

`pnpm check` runs lint, typecheck, tests, and build for all workspaces.

### Local data plane (Slot 02)

```bash
make up
make smoke
make playground   # Postgres/Valkey/OpenSearch + template HTTP demos + traces
```

Connection defaults are in [`.env.example`](.env.example).

**Try the template yourself** (with data plane + service running):

```bash
curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/demo/error
curl http://127.0.0.1:3000/demo/outbound
```

## Commit messages

Use clear, human-authored messages. Reference the roadmap slot when relevant, e.g. `feat(slot-01): add monorepo scaffold`.

See [.cursorrules](.cursorrules) for commit hygiene (no AI co-author trailers).

## License

TBD.

## Lead generation backend

The workspace-scoped lead generation service provides onboarding research,
category-based runs, evidence-backed qualification, audited dynamic tier policies,
fair scheduling and a campaign delivery adapter. See [the service README](services/lead-generation-service/README.md)
and [API and integration contracts](docs/lead-generation.md).
Windows setup: `scripts/setup-lead-generation.ps1`. Explicit demo mode uses synthetic
data; live research requires configured providers and a verified campaign contract.
