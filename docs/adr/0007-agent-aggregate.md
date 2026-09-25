# ADR 0007: Agent aggregate (configuration)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Slot:** 07 — Agent service

## Context

Workspaces need a first-class **Agent** object before versions, runtime, and channels can attach. Agents are configuration (name, instructions, model settings, channel flags), not the execution loop. At scale, 100k agents require indexed lookup by `workspace_id` and unique names per workspace enforced in the database, not in the UI.

## Decision

### Relational agent row

- Store queryable fields as columns; use JSONB only for open-ended `model_settings`.
- `UNIQUE (workspace_id, name)` prevents duplicate names under concurrent creates.
- Integer `version` column with **optimistic concurrency** on update (`expected_version` in API). Zero rows updated → **409 CONFLICT**.

### Tenant isolation

- Every repository method takes `TenantContext` (`workspace_id`, `actor_id`).
- Reads and writes always filter by `workspace_id`. Wrong workspace → **404**, not a leak.

### Authorization

- RBAC permission strings live in `@quickstart/contracts` (shared with workspace service).
- Agent service resolves the caller’s role via **HTTP** to workspace: `GET /v1/workspaces/{id}/members/{actorId}` with forwarded Bearer token.
- Missing permission → **403**. Workspace unreachable → **503** (fail closed).

### Gateway

- Public CRUD routes proxy to **agent-service** (`AGENT_URL`).
- `POST .../agents/{agentId}/publish` remains on **workspace** until Slot 08 (RBAC stub today).

### Out of scope (Slot 07)

- Immutable `agent_versions` and production pointer (Slot 08).
- Runtime reading agent config (Slot 11).

## Failure policy

| If | Then |
| --- | --- |
| Workspace down during RBAC check | **503** `UPSTREAM_UNAVAILABLE` |
| Stale `expected_version` | **409** `CONFLICT` |
| Duplicate name | **409** `CONFLICT` |
| Agent in another workspace | **404** `NOT_FOUND` |

## Still unsafe at 1,000 RPS

- Per-request workspace HTTP for role resolution (no Redis membership cache).
- Draft row is mutable; production must not read it after Slot 08 without the published pointer.
