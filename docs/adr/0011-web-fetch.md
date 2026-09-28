# ADR 0011: Web fetch service

- **Status:** Accepted
- **Date:** 2026-09-28
- **Feature:** 10B — Web fetch service (formerly “web acquisition”)

## Context

Knowledge ingest, tools, leads, and campaigns need public web content (scrape, crawl, search). Vendor APIs are slow, billed per page, and must not run on the API gateway request path. Olostep is one provider, not the service name. Callers must share one timeout, retry, circuit, cap, and usage-fact policy.

## Decision

### Service boundary

- New **`services/web-fetch-service`** on internal port **3007** (local).
- Vendor HTTP for Olostep and plain `fetch` live only in this service.
- **No** public routes on API gateway `:3000` in this feature.

### Internal authentication

- `Authorization: Bearer <WEB_FETCH_INTERNAL_TOKEN>` (min 32 characters). Legacy `WEB_ACQUISITION_INTERNAL_TOKEN` still accepted.
- `workspace_id` required on every request body. Membership is enforced at product APIs (e.g. knowledge gateway later); internal workers are trusted callers.

### Provider routing

1. **`direct_http`** — default for scrape when `render_js` is not true: cheap fetch + HTML-to-text, size-capped.
2. **`olostep`** — when `render_js === true`, or when direct fetch fails before a billable page is committed, or for search when configured.
3. **`fake`** — tests and CI only.

Profiles are configured via env (`ACQUISITION_PROVIDER_PROFILES_JSON`) or defaults. Each profile has `enabled`, `priority`, and `unit_cost_micros` per action.

### Policy (before vendor call)

- Global in-flight cap in Redis (`web-fetch:inflight`).
- Per-workspace daily unit budget in Redis (`web-fetch:units:{workspace_id}:{date}`).
- Deny with **429** `RATE_LIMITED` when budget or cap is exceeded — no vendor call.

### Orchestration

- Per-call timeout (scrape/search ~30s).
- **One retry** on timeout/429/5xx only when **no billable unit** was recorded for that attempt.
- **Circuit breaker** per provider profile; try next profile in policy order once, then **503** `UPSTREAM_UNAVAILABLE`.
- **Usage facts** logged (structured): `workspace_id`, `request_id`, `action`, `provider`, `units`, `estimated_cost_micros`. Feature 26 ledger consumes later.

### Crawl jobs

- `POST /internal/crawl` inserts a Postgres row (`queued`) and returns `job_id` immediately.
- In-process worker claims jobs with `FOR UPDATE SKIP LOCKED` (safe with two replicas).
- Artifact text stored in Postgres for v1 (size cap); object storage later.

### HTTP surface

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/internal/scrape` | Sync single URL |
| POST | `/internal/crawl` | Async multi-page crawl |
| POST | `/internal/search` | Sync web search (low `max_results` cap) |
| GET | `/internal/jobs/:jobId` | Job status and artifact preview |

## Consequences

- Feature 11 knowledge ingest calls this service for URL/site sources; it does not import Olostep.
- Tools (Feature 15) call runtime → internal web acquisition for `fetch_url` / `search_web`.
- Still unsafe: no invoice ledger, no per-org UI for credits, artifacts not on S3 yet.
