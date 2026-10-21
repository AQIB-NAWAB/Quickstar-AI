# Analytics & Usage Dashboard — Backend Dependencies & API Specifications

This document defines the backend contracts, data structures, and boundaries supporting **Feature F9 (Analytics & Usage Dashboard)**.

---

## 1. Implementation Status

- **Status:** **IMPLEMENTED & CONNECTED**
- **Owning Service:** `services/usage-service` (:3017)
- **Database Schema:** `services/usage-service/migrations/002_analytics_rollups.sql`
- **Gateway Proxy:** `services/api-gateway/src/routes/proxy-usage.routes.ts`
- **Web BFF Route:** `apps/web/src/app/api/workspaces/[workspaceId]/analytics/route.ts`
- **Frontend Container:** `apps/web/src/features/analytics/components/analytics-dashboard.tsx` mounted at `/workspaces/:workspaceId/analytics`.

---

## 2. Gateway Endpoint Specification

### `GET /v1/workspaces/:workspaceId/analytics`

#### Query Parameters
- `from` (`string`, optional, default 7 days ago): Inclusive start date in `YYYY-MM-DD` or ISO timestamp (UTC).
- `to` (`string`, optional, default now): Inclusive end date in `YYYY-MM-DD` or ISO timestamp (UTC).
- `timezone` (`string`, optional, default `"UTC"`): Timezone used for daily/hourly grouping.

#### Authorization & Tenancy
- Caller must possess an authenticated JWT with access to `workspaceId`.
- Evaluates against `workspace.analytics.read` under `@quickstart/contracts` RBAC rules.
- Isolated strictly by `workspace_id` in SQL queries.

#### Response Contract
```json
{
  "overview": {
    "total_requests": 14250,
    "total_tokens": 4820000,
    "cached_tokens": 820000,
    "estimated_cost_usd": 156.40,
    "active_conversations": 640,
    "p50_latency_ms": 185,
    "p95_latency_ms": 420,
    "p99_latency_ms": 890,
    "deltas": {
      "requests_pct": 14.2,
      "tokens_pct": -2.8,
      "cost_pct": 11.5
    }
  },
  "timeseries": [
    {
      "date": "2026-10-12",
      "requests": 2100,
      "tokens": 710000,
      "cost_usd": 22.80,
      "cached_tokens": 120000
    }
  ],
  "dual_axis_latency_concurrency": [
    {
      "bucket": "10:00",
      "p50_latency_ms": 178,
      "p95_latency_ms": 410,
      "p99_latency_ms": 860,
      "concurrent_requests": 34
    }
  ],
  "usage_by_service": [
    {
      "service_name": "agent-runtime",
      "model_id": "claude-3-5-sonnet",
      "requests_count": 8200,
      "total_tokens": 3100000,
      "cached_tokens": 620000,
      "cost_usd": 105.40,
      "avg_latency_ms": 220
    }
  ],
  "period": {
    "from": "2026-10-12T00:00:00.000Z",
    "to": "2026-10-18T23:59:59.999Z",
    "timezone": "UTC"
  }
}
```

---

## 3. SQL Aggregation & Percentiles Engine

- **True Statistical Percentiles:** Computed via Postgres `percentile_cont(0.50)`, `percentile_cont(0.95)`, and `percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)`.
- **Comparative Delta Calculations:** Previous period matching equal length `(to - from)` queried to derive percentage changes in requests, tokens, and costs.
- **Fail-Safe Zero Bucketing:** Empty dates within the queried range are filled with zeroed metrics to prevent discontinuous chart lines.
