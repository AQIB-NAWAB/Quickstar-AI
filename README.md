# QuickStart AI

Production-scale, multi-tenant AI agent platform — rebuilt incrementally on the [60-day roadmap](docs/roadmap.md).

## Documentation

- **What we are building:** [docs/project_details.md](docs/project_details.md)
- **Execution plan:** [docs/roadmap.md](docs/roadmap.md)
- **Architecture decisions:** [docs/adr/](docs/adr/)

## Repository layout

```text
services/     Deployable domain services (copy services/_template to add one)
packages/     Shared libraries (contracts, logging, …)
sdk/          Client SDKs (later)
infra/        Terraform (later)
deploy/       Helm / environment configs (later)
tests/        Cross-service tests (later)
docs/         Product spec, roadmap, ADRs, runbooks
```

**Slot 01 (current):** monorepo scaffold and `services/_template` with `GET /healthz` only. No product APIs yet.

## Prerequisites

- Node.js **22+**
- [pnpm](https://pnpm.io/) **9+**

## Setup

```bash
pnpm install
pnpm check
```

`pnpm check` runs lint, typecheck, tests, and build for all workspaces.

## Commit messages

Use clear, human-authored messages. Reference the roadmap slot when relevant, e.g. `feat(slot-01): add monorepo scaffold`.

See [.cursorrules](.cursorrules) for commit hygiene (no AI co-author trailers).

## License

TBD.
