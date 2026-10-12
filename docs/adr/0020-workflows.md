# ADR 0020 — Workflow automation

## Status

Accepted

## Context

Feature 20 needs a durable reaction to platform events. The staff UI already existed against fixtures. Tenants must not invent Kafka event types; they configure workflows on the fixed catalog.

## Decision

1. **`services/workflow-service` (port 3012)** owns workflow definitions, runs, steps, side effects, and dead letters in Postgres.
2. **Triggers** are catalog event types from `@quickstart/contracts` (`conversation.handed_off`, `conversation.released`, `message.appended`, `agent.published`).
3. **Transport:** conversation-service writes outbox rows; an outbox publisher emits to `quickstart.platform.events`; workflow-service consumes with its own consumer group.
4. **Idempotency:** unique `(workflow_id, event_id)` on runs and unique `(run_id, step_id)` on side effects. Replays resume or no-op completed runs.
5. **Actions (v1):** `webhook` (SSRF-safe; HTTPS required unless `WORKFLOW_WEBHOOK_ALLOW_HTTP=true`), `update_tags`, `email_notification`, and `agent_handoff` persist assertable `workflow_side_effects` rows (email/handoff are recorded locally until SES/handoff APIs are wired).
6. **Poison path:** unhandled run failures and invalid envelopes go to `workflow_dead_letters`.
7. **Cap:** max active workflows per workspace (default 50) to limit hot-event storms.
8. **Permissions:** `workspace.workflow.read|edit|activate|delete|runs_read` in contracts.

## Consequences

- Kafka must be enabled for end-to-end fires (`KAFKA_BROKERS`). Without it, CRUD still works; runs will not start from events.
- Gateway proxies `/v1/workspaces/:id/workflows*` to workflow-service.
- Staff UI under `apps/web` talks only through BFF → gateway.
