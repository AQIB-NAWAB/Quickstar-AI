# ADR 0026 — Usage ledger (usage-service)

## Status

Accepted

## Context

Model gateway, web-fetch, and voice emit structured usage logs, but logs are not money. Feature 26 needs an append-only ledger so invoices can be rebuilt. Billing must not sit on the request or live call path (roadmap §29 / Choice).

## Decision

1. **`services/usage-service` (port 3017)** owns Postgres table `usage_entries` (append-only).
2. **Kinds:** `model` | `acquisition` | `voice`.
3. **Emit path (v1):** producers do **not** write the ledger. After a successful billed action they POST a fact to `POST /internal/v1/usage/ingest` with bearer `USAGE_INTERNAL_TOKEN` (fire-and-forget: user success must not fail if ingest is down; log warn). usage-service does `INSERT … ON CONFLICT (idempotency_key) DO NOTHING`.
4. **Price snapshot:** `price_micros` + `currency` stored on the row. Model/voice prices from usage-service config; acquisition may send `estimated_cost_micros` from web-fetch. No vendor billing API.
5. **Staff read:** `GET /v1/workspaces/:workspaceId/usage` (list + sum). Permission `workspace.usage.read` (owner/admin/developer/analyst). Gateway proxies staff GET only; ingest stays internal.
6. **Why not Kafka for Done when:** conversation outbox exists, but model-gateway has no outbox today. Internal ingest + unique key meets Done when and is two-replica safe. Kafka/outbox can wrap the same fact later without changing the ledger schema.
7. **Not in this slice:** Stripe/cards, tax, PDF invoices, F9 analytics rollup UI, crawl per-page metering polish, mutable balance column.

## Idempotency keys

- model: `model:{workspace_id}:{request_id}`
- acquisition: `acquisition:{workspace_id}:{request_id}:{action}`
- speech: `speech:{workspace_id}:{call_id|request_id}:{stt|tts}:{seq}`
- telephony: `telephony:{workspace_id}:{call_id}:completed`

## Consequences

- Gateway proxies `/v1/workspaces/:workspaceId/usage` to usage-service.
- Structured logs (`model.usage`, `acquisition.usage`, `speech.usage`) remain for ops.
- Proof: `scripts/check-usage-proof.mjs`.

## Scale / still unsafe

One row per model call / acquisition action / finished call (or speech unit), not per token or audio packet. Still unsafe without: payment provider, tax, PDF invoice, outbox for lost fire-and-forget emits, F9 daily rollup API.
