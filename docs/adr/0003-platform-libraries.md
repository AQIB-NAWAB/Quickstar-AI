# ADR 0003: Shared platform libraries

- **Status:** Accepted
- **Date:** 2026-09-22
- **Slot:** 03 — Shared platform libraries

## Context

QuickStart AI will ship many HTTP services (identity, agent, runtime, gateway, …). Without shared standards, each service would emit different error JSON, log formats, trace fields, and HTTP client behavior. That makes the gateway, SDKs, and on-call response unreliable—especially before LLM and tool calls add latency and partial failures.

Slot 02 provides local Postgres, Valkey, Kafka, OpenSearch, OTel Collector, and SQS-compatible queues. Slot 03 adds **libraries**, not product login or domain APIs.

## Decision

Introduce workspace packages under `packages/`:

| Package                 | Responsibility                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `@quickstart/errors`    | `AppError`, stable `ErrorCode`, HTTP mapping, JSON envelope with `request_id`             |
| `@quickstart/logging`   | Structured JSON logs + redaction helper for secrets/PII fields                            |
| `@quickstart/tracing`   | OpenTelemetry Node SDK bootstrap, span helpers, QuickStart attribute names                |
| `@quickstart/auth`      | `AuthContext` type + internal header parser (gateway validates JWT in Slot 04+)           |
| `@quickstart/utilities` | `fetchWithPolicy` (timeout + safe retry), circuit breaker, Redis idempotency/lock helpers |

`services/_template` demonstrates: traced requests, platform error envelope, outbound GET with retry policy.

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable summary",
    "request_id": "uuid",
    "details": {}
  }
}
```

### Retry policy

- Retry **GET/HEAD/PUT/DELETE** on 5xx/429 (bounded attempts + backoff).
- **Do not retry POST** unless an idempotency key is present (test enforced).
- Every outbound call has a **timeout**.

### Auth context (stub)

Services trust **`x-quickstart-auth-context`** (base64url JSON) only **after** the API gateway validates credentials (Slot 06). Services must not treat body/query `userId` as authoritative.

## Consequences

- New services copy `_template` and import the same packages.
- `pnpm check` builds and tests all packages.
- Local traces export to the Slot 02 OTel collector when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- Redis helpers require Valkey/Redis for integration tests later; unit tests cover retry classification without Redis.

## Alternatives rejected

| Alternative                     | Why not                                           |
| ------------------------------- | ------------------------------------------------- |
| Per-service error formats       | Gateway/SDK cannot unify client behavior          |
| console.log tracing only        | Cannot follow requests across microservices (§44) |
| Default `fetch` without timeout | Hung pods when LLM/tools stall                    |
| Query-string `userId`           | Spoofable; breaks tenant isolation                |

## References

- `docs/project_details.md` — §38, §41–42, §44, §59
- `docs/roadmap.md` — Slot 03
