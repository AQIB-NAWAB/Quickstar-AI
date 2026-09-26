# ADR 0009: Agent versions and production pointer

- **Status:** Accepted
- **Date:** 2026-09-26
- **Feature:** 08 — Agent versions and publish

## Context

Agent drafts (ADR 0007) mutate in place with optimistic concurrency. Production chat (Feature 12) must read a **frozen** configuration. Without immutable versions and a production pointer, every draft edit changes live behavior and rollback is impossible.

## Decision

### Immutable version rows

- Table `agent_versions`: insert-only snapshots (`snapshot` JSONB) with per-agent `release_number`.
- `agents.production_version_id` points at the current production version (nullable until first publish).

### Publish transaction

In one Postgres transaction:

1. Lock agent row (`FOR UPDATE`).
2. Reject if `agents.version != base_version` → **409 CONFLICT**.
3. Insert `agent_versions` from current draft fields.
4. Set `production_version_id` to the new version id.
5. Commit.

No HTTP or LLM calls inside the transaction.

### Rollback

Update `production_version_id` only. Version rows are never updated or deleted by rollback.

### Authorization

- `workspace.agent.publish` for publish and rollback.
- `workspace.agent.read` for list/get/diff.
- Enforced in agent-service via workspace membership HTTP (same as ADR 0007).

### Gateway

Publish, rollback, and version routes proxy to **agent-service**. Workspace publish stub removed.

## Failure policy

| Condition | Response |
| --- | --- |
| Stale `base_version` | **409** `CONFLICT` |
| Wrong workspace / unknown agent or version | **404** `NOT_FOUND` |
| Missing publish permission | **403** `FORBIDDEN` |
| Workspace RBAC lookup failure | **503** `UPSTREAM_UNAVAILABLE` |

## Out of scope

- Runtime loading production pointer (Feature 12).
- `agent.published` Kafka event (Feature 19).
- Publish idempotency key (network retry may create two releases).
- Eval-gated publish.

## References

- [ADR 0007: Agent aggregate](./0007-agent-aggregate.md)
- [Roadmap Feature 08](../roadmap.md)
