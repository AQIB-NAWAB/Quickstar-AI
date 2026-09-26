# ADR 0010: Model gateway

- **Status:** Accepted
- **Date:** 2026-09-26
- **Feature:** 10 — Model gateway

## Context

Runtime (Feature 12) and other internal callers must call LLM vendors without importing vendor SDKs or holding platform API keys in every service. Chat completions are slow, billed, and need timeouts, safe retry, optional fallback, global in-flight limits, and usage telemetry for later billing (Feature 26).

**Jev** (TypeSafe AI) is a decision model exposed via OpenRouter’s Decisions API. It returns typed `choice`, `score`, or `noul` answers with probabilities. It is used for routing, moderation, and risk gates—not for token generation.

## Decision

### Service boundary

- New **`services/model-gateway`** on internal port **3005** (local).
- Vendor HTTP/SDK calls live only in this service.
- **No** public routes on API gateway `:3000` until runtime is the sole product caller (Feature 12).

### Internal authentication

- `Authorization: Bearer <MODEL_GATEWAY_INTERNAL_TOKEN>` (min 32 characters), shared with trusted internal callers (runtime).
- End-user JWT is not used on `/internal/*`.

### HTTP surface

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/internal/complete` | Non-streaming chat completion |
| POST | `/internal/stream` | Server-Sent Events token stream |
| POST | `/internal/decide` | Jev / OpenRouter Decisions API proxy |

### Request contract (summary)

- `workspace_id`, `request_id`, `model: { profile, model_id }`, `messages[]`
- Optional: `temperature`, `max_tokens`, `fallback_model`, `routing_mode` (`static` \| `jev`)
- Credentials: `credential_source: "platform" \| "workspace"`, optional `credential_ref`

**BYOK:** `credential_source: "workspace"` returns **400** `VALIDATION_FAILED` until Feature 16 (secrets) can resolve `credential_ref`. Platform keys come from env provider profiles only.

### Orchestration

- Per-call timeout (default 60s complete).
- **One retry** on timeout, 429, or 5xx only when **no stream bytes** were sent to the client.
- **One fallback** completion if `fallback_model` is set and primary fails before tokens.
- **Circuit breaker** per provider profile (`@quickstart/utilities`).
- **Global in-flight cap** in Redis (`MODEL_MAX_INFLIGHT`) so two replicas share the same limit; reject with **429** `RATE_LIMITED` when full.

### Streaming

- Response: `text/event-stream`.
- Events: `token` (JSON `{ "delta": string }`), then `done` (finish reason + usage).
- After the first `token` event, do not start a second full completion for the same request.

### Provider drivers

| Driver | Use |
| --- | --- |
| `fake` | CI and local tests |
| `openai_compatible` | OpenAI-shaped APIs (OpenAI, Groq, DeepSeek, custom base URL) |
| `openrouter` | OpenRouter chat (`https://openrouter.ai/api/v1`) |
| `anthropic` | Anthropic Messages API |

Profiles are named in config (`PROVIDER_PROFILES_JSON` or built-in defaults from env).

### Jev

- `POST /internal/decide` forwards to OpenRouter Decisions API (`typesafe/jev-1.13` or `~typesafe/jev-latest`).
- Optional `routing_mode: "jev"` on complete may select a model from a static route table before chat; on Jev failure, fall back to the request’s primary `model`.

### Usage

- Structured log event `model.usage` with `workspace_id`, `provider`, `model`, tokens, `latency_ms`, `request_id`.
- No billing ledger write on the request path.

## Failure policy

| Condition | Response |
| --- | --- |
| Missing/invalid internal token | **401** `UNAUTHORIZED` |
| Invalid body | **400** `VALIDATION_FAILED` |
| Workspace credential before secrets | **400** `VALIDATION_FAILED` |
| In-flight cap exceeded | **429** `RATE_LIMITED` |
| Circuit open | **503** `UPSTREAM_UNAVAILABLE` |
| Vendor timeout | **504** `UPSTREAM_TIMEOUT` |
| Vendor 429/5xx (exhausted retry/fallback) | **503** `UPSTREAM_UNAVAILABLE` |

## Still unsafe

- Per-workspace spend and concurrency caps belong in **runtime** (Redis), not model-gateway.
- No dollar caps or Feature 26 ledger.
- Workspace BYOK until Feature 16.
- Jev on every request without caching increases cost; keep static defaults.

## Consequences

- Runtime depends on HTTP + contracts types, not vendor SDKs.
- Operational ownership of keys, caps, and vendor outages is centralized.
- Additional adapters are new driver code in model-gateway only.
