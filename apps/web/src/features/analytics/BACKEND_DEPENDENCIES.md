# Analytics & Usage Dashboard — Backend Dependencies & API Specifications

This document defines the backend contracts, data structures, and boundaries required to support **Feature F9 (Analytics & Usage Dashboard)** once **Feature 26 (Usage Ledger & Analytics)** is implemented.

---

## 1. Current Working Tree Status

As of this implementation:
- **Telemetry logging:** Model calls and web fetch acquisition actions record telemetry events, but there is no centralized queryable usage ledger or aggregated reporting service.
- **Permissions:** The contract permission `workspace.analytics.read` is declared and enforced on the workspace route.
- **Reporting API:** No public gateway route exists yet for workspace-level usage aggregation (`/v1/workspaces/:workspaceId/analytics`).
- **Frontend Behavior:** In production, the authenticated route `/workspaces/:workspaceId/analytics` honestly presents an understated unavailable banner:
  > *"Analytics data is not available yet. This workspace's usage reporting is not connected."*
  with metric cards displaying "—", while keeping date-range controls fully functional.
- **Development Preview:** The visual layout, charts, and interactive date controls are previewable with deterministic sample data at `/preview/analytics`.

---

## 2. Proposed Gateway Endpoint Specification

### `GET /v1/workspaces/:workspaceId/analytics`

#### Query Parameters
- `from` (`string`, required): Inclusive start date in `YYYY-MM-DD` (UTC).
- `to` (`string`, required): Inclusive end date in `YYYY-MM-DD` (UTC).
- `timezone` (`string`, optional, default `"UTC"`): Timezone used for daily/hourly grouping. Currently fixed to `"UTC"` in the web application.

#### Authorization & Tenancy
- Caller must possess an authenticated JWT with access to `workspaceId`.
- Caller role must evaluate to `workspace.analytics.read: true` under `@quickstart/contracts` RBAC rules (`owner`, `admin`, `developer`, `operator`, `analyst`).

---

## 3. Required Data Model & Field Definitions

### A. Summary Metrics (`summary`)
All values must represent totals computed strictly over the interval `[from 00:00:00Z, (to + 1 day) 00:00:00Z)`.
- `total_tokens` (`number | null`): Sum of all prompt and completion tokens.
- `input_tokens` (`number | null`): Total prompt/input tokens.
- `output_tokens` (`number | null`): Total completion/output tokens.
- `conversations` (`number | null`): Total new conversation threads *started* in this interval (distinct from total messages or turns).
- `latency_p50_ms` (`number | null`): Overall median response duration in milliseconds across all samples in the selected interval.
  - *Measurement Boundary:* Must be documented whether this measures model completion duration or assistant end-to-end turn time.
- `latency_p95_ms` (`number | null`): Overall 95th percentile response duration in milliseconds.
- `voice_minutes` (`number | null`): Total billable voice connection duration in minutes.
- `voice_calls` (`number | null`): Total number of voice sessions initiated.
- `billable_acquisition_actions` (`number | null`): Total billable scrape, crawl, search, and map actions.

### B. Daily Token Consumption (`daily_tokens`)
Array of daily buckets for every inclusive UTC calendar date in the requested range:
```json
[
  {
    "date": "2026-10-01",
    "input_tokens": 96000,
    "output_tokens": 32000,
    "total_tokens": 128000
  }
]
```
*Reconciliation Rule:* Sum of `input_tokens` and `output_tokens` across all days must equal `summary.input_tokens` and `summary.output_tokens`.

### C. Model & Provider Breakdown (`models`)
Array of distinct providers and models active in the period:
```json
[
  {
    "provider": "OpenAI",
    "model": "gpt-4o",
    "tokens": 2112000,
    "percentage": 55.0,
    "input_tokens": 1584000,
    "output_tokens": 528000
  }
]
```
*Coverage Rule:* If model breakdown covers only a subset of total tokens, the response must indicate coverage count so the UI does not silently reconcile discrepancies.

### D. Daily Conversation Starts (`daily_conversations`)
Array of conversation starts per UTC calendar day:
```json
[
  {
    "date": "2026-10-01",
    "conversations": 420
  }
]
```

### E. Hourly Activity Distribution (`hourly_conversations`)
Array of exactly 24 hourly buckets (`0` to `23`) aggregating conversation starts across all days in the requested interval:
```json
[
  { "hour": 0, "conversations": 180 },
  { "hour": 14, "conversations": 1220 }
]
```
*Reconciliation Rule:* Sum across hours 0..23 must equal `summary.conversations`.

### F. Daily Response Latency Percentiles (`daily_latency`)
Array of daily latency percentiles:
```json
[
  {
    "date": "2026-10-01",
    "p50_ms": 1180,
    "p95_ms": 3720,
    "sample_count": 1260
  }
]
```
*Semantics:* If no responses occurred on a given date, `p50_ms` and `p95_ms` must be `null` (not `0`), creating an intentional visual gap in the line chart.

### G. Billable Acquisition Actions (`acquisitions`)
Array of billable actions grouped by action type:
```json
[
  { "action": "scrape", "label": "Scrape", "billable_units": 2840 },
  { "action": "crawl", "label": "Crawl pages", "billable_units": 2160 },
  { "action": "search", "label": "Search", "billable_units": 980 },
  { "action": "map", "label": "Map", "billable_units": 340 }
]
```
*Units Rule:* Units must reflect billable items (e.g. crawl pages crawled, not crawl jobs scheduled).

---

## 4. Error & Partial Coverage Semantics

| Scenario | HTTP Status | Response Contract | Frontend Handling |
| --- | --- | --- | --- |
| Workspace reporting not deployed | 501 / 404 | `{ "error": { "code": "REPORTING_NOT_CONNECTED", "message": "Usage reporting is not connected." } }` | Displays understated unavailable banner; preserves date controls. |
| User lacks `workspace.analytics.read` | 403 | `{ "error": { "code": "FORBIDDEN", "message": "Access denied." } }` | Displays permission required guard page. |
| Invalid date range (e.g. >366 days, from > to) | 400 | `{ "error": { "code": "INVALID_DATE_RANGE", "message": "Date range cannot exceed 366 days." } }` | Displays validation error in banner; retry available. |
| Transient service timeout / database error | 503 | `{ "error": { "code": "SERVICE_UNAVAILABLE", "message": "Temporary reporting timeout." } }` | Displays `role="alert"` banner with Retry button. |
