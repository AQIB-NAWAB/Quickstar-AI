# ADR 0015 — Tools and MCP (Feature 15)

## Status

Accepted

## Context

The runtime turn path loads agent instructions, conversation history, optional RAG (ADR 0013), and optional memory (ADR 0014), then calls the model gateway once. Agents need **side effects**: HTTP calls to customer systems, web acquisition (ADR 0011), and eventually MCP servers. Without durable idempotency and host allow-lists, retries create duplicate tickets and SSRF risk.

## Decision

### Ownership

- **Tool definitions** live on the agent draft (`agents.tools` JSONB) and are frozen in the **published version snapshot** (ADR 0009).
- **`tool_calls` execution rows** live in **conversation-service** Postgres (same DB as messages). Runtime stays stateless.
- **Execution loop** stays in **runtime-service**; no new tools microservice in v1.

### Tool types (v1)

| `type` | Behavior |
| --- | --- |
| `http` | Allow-listed host HTTP with per-tool `timeout_ms` |
| `builtin_web` | `scrape` or `search` via web-fetch-service internal API (ADR 0011) |
| `mcp` | MCP client to `server_url`; only `allowed_tool_names` exposed to the model |

### Caps

| Limit | Value |
| --- | --- |
| Tools per agent | 20 |
| Tool rounds per turn | 5 |
| Default tool timeout | 30_000 ms (max 60_000) |
| Tool argument JSON max | 16_384 bytes |
| Tool result stored / injected max | 32_768 chars (truncate for model) |

### Idempotency

- Turn client supplies `Idempotency-Key` on `POST .../turns` (ADR 0008).
- Per execution: `tool_call_key = {turnIdempotencyKey}:tool:{round}:{toolName}` unique per `workspace_id`.
- Before outbound I/O: upsert `tool_calls` row `pending`. On duplicate key with terminal status (`succeeded` / `failed` / `unknown`), **do not** re-execute; replay stored outcome to the model.
- **Non-idempotent** HTTP tools (`idempotent: false`): on timeout → status `unknown`; **no blind retry**.

### Allow-list (HTTP)

- `allowed_hosts` required for `http` tools; request host must match exactly (case-insensitive).
- Block private/link-local/metadata IP ranges and `localhost` in production config validation.
- Do not allow URLs that point at the platform gateway host (configurable deny list).

### Fail policy

- Tool step failure returns structured error to the model; turn may still complete with assistant text unless all rounds exhausted.
- Web-fetch `RATE_LIMITED` / budget: fail tool step; runtime does **not** retry vendor.
- MCP connection errors: `failed` with typed code; no unbounded reconnect within one turn.

### Permissions

- `workspace.tools.run` required on turn path (roles with `CONVERSATION_PARTICIPATE`: owner, admin, operator, human_agent).
- Tool configuration via existing agent update APIs (`AGENT_UPDATE`).

### Model gateway

- `CompletionRequestBody` may include `tools`; response may return `finish_reason: tool_calls` and `tool_calls[]`.
- Fake profile supports `model_id: fake:tool_once` for integration tests.

### Logging

- Do not log full tool request/response bodies at info. Log `tool_call_key`, `tool_name`, `status`, `request_id`.

## Consequences

- Feature 16 secrets will supply HTTP auth by reference; v1 may omit Authorization headers on customer HTTP tools.
- Streaming turns with tools deferred.
- Voice (21) reuses the same loop with stricter deadlines later.
