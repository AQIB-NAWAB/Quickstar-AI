# QuickStart AI

Production-scale, multi-tenant AI agent platform — rebuilt incrementally on the [60-day roadmap](docs/roadmap.md).

## Documentation

- **What we are building:** [docs/project_details.md](docs/project_details.md)
- **Execution plan:** [docs/roadmap.md](docs/roadmap.md)
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
