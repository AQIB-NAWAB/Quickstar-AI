# Model gateway — error mapping

Internal API (`POST /internal/complete`, `/internal/stream`, `/internal/decide`). Responses use the platform JSON envelope with `request_id`.

| Condition | HTTP | `code` |
| --- | --- | --- |
| Missing or invalid internal bearer token | 401 | `UNAUTHORIZED` |
| Invalid request body | 400 | `VALIDATION_FAILED` |
| Workspace `credential_source` before Feature 16 | 400 | `VALIDATION_FAILED` |
| Global in-flight cap exceeded | 429 | `RATE_LIMITED` |
| Provider circuit open | 503 | `UPSTREAM_UNAVAILABLE` |
| Provider timeout | 504 | `UPSTREAM_TIMEOUT` |
| Provider exhausted retry/fallback | 503 | `UPSTREAM_UNAVAILABLE` |
| Jev unavailable (no OpenRouter key) | 400 | `VALIDATION_FAILED` |

Streaming: if failure occurs **after** the first `token` event, the HTTP status remains 200 and an SSE `error` event is sent (no second full completion).
