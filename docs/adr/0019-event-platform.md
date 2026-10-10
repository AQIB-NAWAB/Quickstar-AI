# ADR 0019 — Event platform (outbox + at-least-once)

- **Status:** Accepted
- **Date:** 2026-10-10
- **Feature:** 19 — Event platform

## Context

Product actions (handoff, publish, messages) commit in Postgres. Downstream features (workflows, analytics, notifications) must react without polling hot tables or blocking HTTP on Kafka availability.

## Decision

### Platform events (not tenant-defined types)

- Event **types** are product-owned strings in `packages/contracts` (e.g. `conversation.handed_off`).
- Tenants do **not** register custom Kafka event names. Admin scenarios (“notify when user asks about payment”) are **Feature 20 workflows** (trigger + conditions + actions) and **F12/F13** notifications/webhooks — not new bus types.

### Transactional outbox

- Table `outbox_events` in the conversation database (v1).
- Insert outbox row in the **same transaction** as the business write.
- HTTP succeeds when Postgres commits; publish is asynchronous.

### Delivery

- At-least-once to Kafka topic `quickstart.platform.events`.
- Publisher process polls unpublished rows (`FOR UPDATE SKIP LOCKED`), produces, sets `published_at`.
- If `KAFKA_BROKERS` is unset, outbox rows accumulate; take/handoff API behavior unchanged.

### Envelope

- Fields: `event_id`, `type`, `workspace_id`, `occurred_at`, `request_id`, `data` (type-specific JSON).

### v1 producer and consumer

- **Producer:** `conversation.handed_off` on successful take.
- **Consumer:** idempotent handoff counter per workspace (`event_consumer_receipts` + `workspace_handoff_metrics`).

## Consequences

- Duplicate Kafka delivery must not double-count (receipt table keyed by `event_id`).
- Consumer slow work must not block partitions forever (v1 consumer is lightweight; heavy work deferred to Feature 20 workers).
