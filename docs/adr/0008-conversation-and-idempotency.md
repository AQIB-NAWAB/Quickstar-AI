# ADR 0008: Conversation aggregate and message idempotency

- **Status:** Accepted
- **Date:** 2026-09-25
- **Feature:** 09 — Conversation service

## Context

Conversations and sequential chat messages require durable, ordered storage partitioned strictly by workspace tenant. In distributed production environments running multiple service replicas, in-memory sequence counters cause race conditions, gaps, and duplicate message numbers. Furthermore, network timeouts and client retries cause duplicate message insertions without idempotency deduplication. Redis is an ephemeral cache, not a durable chat database; container file systems disappear on restart.

## Decision

### PostgreSQL as the Single Source of Truth

- Store `conversations` and `messages` in PostgreSQL with strict `workspace_id` tenant scoping on every table and query.
- Do not write chat history to Redis or local disk. If PostgreSQL is unavailable, return **503 SERVICE_UNAVAILABLE** immediately.

### Atomic Sequence Counter in PostgreSQL

- Sequential message numbering (`seq`) is allocated atomically inside the PostgreSQL database transaction:
  ```sql
  UPDATE conversations
  SET last_seq = last_seq + 1, updated_at = NOW()
  WHERE id = $1 AND workspace_id = $2
  RETURNING last_seq;
  ```
- Two or more concurrent service replicas remain completely safe because sequence ordering is coordinated by PostgreSQL row locking rather than Node.js process memory.

### Idempotency Key Deduplication

- Enforce `UNIQUE (conversation_id, idempotency_key)` in the database schema.
- Before incrementing `last_seq`, check if a message with `(conversation_id, idempotency_key)` already exists:
  - If found: return the existing message with status **200 OK** and `deduplicated: true`. Do not increment `last_seq`.
  - If new: atomically increment `last_seq`, insert the message, and return status **201 CREATED** with `deduplicated: false`.

### Multi-Tenant Isolation (Anti-IDOR)

- Every repository read, write, and list operation requires `workspace_id`.
- Any attempt to access a conversation using a different workspace's path returns **404 NOT_FOUND** (fail closed, no leaked existence or payload).

### Gateway Routing & Authorization

- Gateway proxies `/v1/workspaces/:workspaceId/conversations*` to the conversation service (`CONVERSATION_URL`, port 3004).
- RBAC permissions enforced:
  - `workspace.conversation.participate`: create conversation, append message.
  - `workspace.conversation.read`: read conversation, list messages.

## Failure Policy

| Condition | Response / Behavior |
| --- | --- |
| PostgreSQL connection or query failure | **503** `SERVICE_UNAVAILABLE` (fail closed, no local buffering) |
| Workspace RBAC lookup failure | **503** `UPSTREAM_UNAVAILABLE` |
| Caller lacks conversation permission | **403** `FORBIDDEN` |
| Conversation in another workspace | **404** `NOT_FOUND` |
| Idempotent retry | **200** `OK` with existing message and `deduplicated: true` |

## Out of Scope & Future Work

- Table partitioning by workspace or creation date (messages table grows unboundedly).
- Archival jobs and cold storage offloading.
- Real-time streaming or WebSocket pub/sub (handled by runtime/gateway in subsequent slots).
