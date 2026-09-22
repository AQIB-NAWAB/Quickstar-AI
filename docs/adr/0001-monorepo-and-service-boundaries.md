# ADR 0001: Monorepo and service boundaries

- **Status:** Accepted
- **Date:** 2026-09-22
- **Slot:** 01 — Engineering foundation

## Context

QuickStart AI is a multi-tenant AI agent platform with many domain services (identity, agent, runtime, voice, etc.) and shared contracts. A small team has **60 days** to deliver the full architecture described in `docs/project_details.md`.

We need one repository layout that supports real service boundaries without drowning in cross-repo PRs or a monolith rewrite when events and voice arrive.

## Decision

1. **Monorepo** with `services/*` (deployables) and `packages/*` (shared libraries).
2. **TypeScript on Node** for API-facing services unless a later slot proves a small Go/Python sidecar.
3. **HTTP/JSON** as the default inter-service and public API style for the MVP.
4. **One ADR per roadmap slot** under `docs/adr/`.
5. New services are created by copying `services/_template`, not by inventing a new layout each time.

## Consequences

- Contract changes (types, error shapes) can ship in a single PR with consumer updates.
- CI runs lint, typecheck, test, and build across workspaces with `pnpm check`.
- Shared code must stay thin (`contracts`, logging, tracing, errors, auth) — no “god package.”
- Docker and Kubernetes work builds from known paths per service.

## Alternatives considered

| Alternative                     | Why not (for this project)                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Polyrepo (one repo per service) | Cross-service changes and contract drift are too costly for a small team on a fixed calendar.           |
| Monolith first, split later     | Conflicts with the learning goals; split usually happens as an emergency rewrite at events/voice scale. |

## References

- `docs/project_details.md` — §36 (service architecture), §60 (repository structure), §59 (developer experience)
- `docs/roadmap.md` — Slot 01
