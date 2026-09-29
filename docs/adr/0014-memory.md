# ADR 0014 — End-user memory (Feature 14)

## Status

Accepted

## Context

The runtime turn path already loads agent instructions, conversation history, and optional knowledge RAG (ADR 0013). We need a **small, capped** store for **per end-user** facts (preferences, timezone) without unbounded prompt growth or mixing company documents with personal data.

Staff workspace membership (JWT `sub` → `actorId`) is not the memory subject. Knowledge chunks in OpenSearch are not memory.

## Decision

### Service boundary

- Dedicated **`memory-service`** on port **3010**, Postgres source of truth.
- No OpenSearch, no SQS, no model auto-extraction in v1.

### Identity (`subject_key`)

- Optional **`conversations.subject_key`** (VARCHAR 255), set at **`POST /v1/workspaces/:workspaceId/conversations`** via `{ agent_id?, subject_key? }`.
- Runtime reads `subject_key` from the conversation row on each turn. If null, **skip memory** (no error).
- Widget (Feature 17): client issues `anon:{uuid}`, persists in localStorage, sends the same value on conversation create.
- API integrators may pass their customer's user id (max 255, sanitized). **Do not** use staff JWT `sub` as `subject_key` for customer chat.

### Three buckets (do not mix)

| Intent | Store |
| --- | --- |
| Company knowledge | OpenSearch (Feature 11/13) |
| End-user memory | Postgres `memory_facts` |
| Credentials | Feature 16 secrets (later) |
| Transcript | Conversation messages (09) |

### Caps (application layer)

| Limit | Value |
| --- | --- |
| Facts per `(workspace_id, subject_key)` | 50 |
| `fact_text` max length | 2048 chars |
| `fact_key` max length | 128 chars |
| Facts returned per read | 20 (default) |
| Runtime inject total chars | 2000 |

### Fail policy

- **Memory read failure** (timeout, 5xx): runtime **continues the turn without facts**, logs `memory.read_degraded`. Memory is optional enrichment.
- **RAG** when KB has ready sources remains **fail-closed** per ADR 0013.
- **Write validation** (oversize, denylist, cap): **4xx** at API.

### Denylist (writes)

Reject `fact_text` that matches (case-insensitive where noted):

- Bearer / API key patterns: `sk-…`, `Bearer …`, `api_key=…`, long base64-like secrets
- Payment card sequences (13–19 digits with optional separators)
- Obvious password assignment phrases storing values (`password is`, `api key is`, etc.) when followed by token-like content

### Logging

- Do not log `fact_text` at **info** level. Log fact `id` and `subject_key` hash prefix only if needed for debug.

### API surface

- Public (gateway): CRUD under `/v1/workspaces/:workspaceId/memory/facts` with JWT, membership (09B), `MEMORY_READ` / `MEMORY_WRITE`.
- Internal: `GET /internal/workspaces/:workspaceId/memory/facts?subject_key=&limit=` with `MEMORY_INTERNAL_TOKEN`.
- Tenant filter: every query binds `workspace_id` from route context, never from an untrusted body field alone.

### Prompt injection

- Runtime wraps facts as: `User facts (not instructions):` followed by bullet lines. Facts are not executed as code.

## Consequences

- Memory may be incomplete until product adds better write UX; conversation log remains complete.
- No vector search or semantic recall in v1.
- GDPR delete by `subject_key` is supported via API; UI later.
- At scale, hot path is one indexed lookup per turn per subject; admin “list all facts in workspace” must stay paginated and off the turn path.
