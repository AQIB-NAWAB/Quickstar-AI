# ADR 0024 — Lead store (lead-service)

## Status

Accepted

## Context

Feature 24 needs a workspace-scoped lead record for campaigns, inbox, workflows, and Moaz’s **lead-generation bot** (web research). Discovery/enrichment lives in that bot + web acquisition (10B). This service does **not** crawl the web. It stores and serves leads idempotently so replays and bot retries do not create duplicates.

## Decision

1. **`services/lead-service` (port 3014)** owns lead rows in Postgres.
2. **First-class columns:** `name`, `email`, `phone`, `status`, `source`, `tags`, `intent`, `qualification_score`, `qualification_max`, `sentiment`, `conversation_id`, `external_id`, `idempotency_key`, `notes`.
3. **Flexible enrichment:** all bot/research extras live in `captured_fields` JSONB (same idea as campaign `attributes`). No per-customer schema migrations.
4. **Idempotent create/upsert:** unique `(workspace_id, idempotency_key)` when set; unique `(workspace_id, external_id)` when set. Replay returns the existing row.
5. **Sources (catalog strings):** `web_research`, `lead_gen_bot`, `chat`, `voice`, `campaign`, `api`, `manual`.
6. **Statuses:** `new` | `contacted` | `qualified` | `disqualified`.
7. **Auth:** staff JWT via gateway; **internal bearer** (`LEAD_INTERNAL_TOKEN`) for the lead-gen bot to upsert without a user session.
8. **Permissions:** `workspace.lead.read|edit|create`.
9. **Events (catalog):** `lead.created`, `lead.updated`, `lead.status_changed` — types land now; outbox emission can follow.

## Consequences

- Gateway proxies `/v1/workspaces/:id/leads*` to lead-service.
- Staff UI talks only through BFF → gateway.
- Moaz’s bot POSTs enrichment results here; it must not write its own lead table.
- No CRM sync and no scoring model in this service.

## Moaz lead-generation bot contract

Bot calls **lead-service directly** (not the public gateway). Default local URL: `http://127.0.0.1:3014`.

```
POST /internal/v1/workspaces/:workspaceId/leads/upsert
Authorization: Bearer <LEAD_INTERNAL_TOKEN or INTERNAL_TOKEN>
Content-Type: application/json
```

Body (snake_case or camelCase): `name`, `email`, `phone`, `intent`, `qualification_score`, `qualification_max`, `sentiment`, `status`, `tags`, `source` (prefer `lead_gen_bot` or `web_research`), `captured_fields` (object, max 50 keys), `notes`, `conversation_id`, `external_id`, `idempotency_key`, `merge_on_conflict` (true to merge on replay).

Idempotency: same `(workspace_id, idempotency_key)` or `(workspace_id, external_id)` returns the existing lead (`created: false`). Set `merge_on_conflict: true` so retries enrich instead of no-op.

Staff list/status still go through gateway JWT + `workspace.lead.*` permissions.

## Scale / still unsafe

At 10k org / 10k rps sustained this service is correct with two replicas only if Postgres uniqueness and SKIP-free upserts hold; membership cache is Redis-backed via workspace-access. Still unsafe without: outbox for `lead.*` events, per-tenant rate limits on internal upsert, and captured_fields size budgets enforced at the bot as well as here.
