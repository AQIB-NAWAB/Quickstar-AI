# Web fetch — error mapping

Internal API (`POST /internal/scrape`, `/internal/crawl`, `/internal/search`, `GET /internal/jobs/:jobId`). Responses use the platform JSON envelope with `request_id`.

| Condition | HTTP | `code` |
| --- | --- | --- |
| Missing or invalid internal bearer token | 401 | `UNAUTHORIZED` |
| Invalid request body or unknown URL | 400 | `VALIDATION_FAILED` |
| Workspace daily acquisition unit budget exceeded | 429 | `RATE_LIMITED` |
| Global in-flight cap exceeded | 429 | `RATE_LIMITED` |
| Provider circuit open / exhausted fallback | 503 | `UPSTREAM_UNAVAILABLE` |
| Provider timeout | 504 | `UPSTREAM_TIMEOUT` |
| Job not found | 404 | `NOT_FOUND` |
| Duplicate idempotency key with different payload | 409 | `CONFLICT` |

Budget exhaustion uses `RATE_LIMITED` with message `Acquisition budget exceeded` until Feature 26 adds a dedicated billing code.
