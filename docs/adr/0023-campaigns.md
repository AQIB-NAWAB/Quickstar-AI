# ADR 0023 — Outbound campaigns

## Status

Accepted

## Context

Feature 23 needs a durable outbound batch dialer. The staff UI (F6) already exists against fixtures. Dialing inside an HTTP request double-dials on retry and times out. Voice telephony (21C) is not ready; campaigns must still own queue state against a dial stub so two workers never claim the same target.

Customer CSVs do not share one column layout. Hardcoding `phone` / `name` / `email` / `company` forces renames and migrations. Leads (24) will feed the same audience shape later.

## Decision

1. **`services/campaign-service` (port 3013)** owns campaigns, targets, attempts, and the claim worker in Postgres.
2. **Audience flexibility:** only `dial_address` (E.164 phone in v1) is a first-class required column. Optional denorm `display_name` and `email` exist for list UX. All other mapped CSV columns live in `attributes` JSONB. Each campaign stores an `audience_schema` (ordered field defs with roles: `dial` | `identity` | `contact_email` | `custom`).
3. **HTTP creates/updates only.** A worker claims rows with `FOR UPDATE SKIP LOCKED`. Each attempt has a unique idempotency key `(campaign_id, target_id, attempt_number)`.
4. **Dial path:** `DialAdapter` selects stub (`CAMPAIGN_DIAL_MODE=stub`) or **voice** (`CAMPAIGN_DIAL_MODE=voice` → `VoiceDialAdapter` calls voice-service internal simulate / test double). Campaign-service never owns media sockets. Shipped Feature 23 v1.
5. **Caps:** per-campaign pacing (`max_concurrent_calls`, `max_starts_per_minute`) plus respect for future voice Redis outbound caps. Create-campaign accepts an idempotency key so client retry does not create two campaigns.
6. **Permissions:** `workspace.campaign.read|edit|control|delete` in contracts.
7. **Events (catalog):** `campaign.started`, `campaign.paused`, `campaign.completed`, `campaign.target.attempted` — emitted later when the outbox path is wired; types land in contracts now.

## Consequences

- Gateway proxies `/v1/workspaces/:id/campaigns*` to campaign-service.
- Staff UI talks only through BFF → gateway.
- Large CSV import is capped in v1 (row count / attribute size). Object-storage import jobs are a follow-up.
- AMD, voicemail detection, and compliance copy remain deferred (Feature 23 "still unsafe").
- Opt-out is a target status; quiet hours use the campaign schedule window only.
