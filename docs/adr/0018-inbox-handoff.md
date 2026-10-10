# ADR 0018 — Inbox and human handoff

- **Status:** Accepted
- **Date:** 2026-10-10
- **Feature:** 18 — Inbox and human handoff

## Context

Conversations and messages exist. The runtime answers on every turn while `state` is effectively always “bot”. Staff cannot take ownership; two agents could not be prevented from both replying. Widget and staff turns share the same conversation row.

## Decision

### Conversation state (Postgres, source of truth)

- Columns on `conversations`: `state` (`bot` | `waiting` | `human`), `assignee_user_id` (nullable UUID, staff user id from JWT `sub`).
- Default for new rows: `state = 'bot'`, `assignee_user_id = NULL`.
- Index: `(workspace_id, state, updated_at DESC)` for inbox lists.

### State machine (v1)

- **`take`:** allowed when `state IN ('bot', 'waiting')`. Sets `state = 'human'`, `assignee_user_id = actor`. Conditional update; zero rows → **409 CONFLICT**.
- **`release`:** allowed when `state = 'human'` and (`assignee_user_id = actor` OR actor role is `owner` or `admin`). Sets `state = 'bot'`, clears assignee.
- **`waiting`:** column value reserved; v1 API does not set it (future widget “request human”).

### Human messages

- `sender_type = 'human'` only when `state = 'human'`.
- Sender must be assignee, or role `owner` / `admin`.

### Runtime

- Before model call (staff turn and widget turn): if `state === 'human'`, return **409 CONFLICT** and do not call model gateway.

### Authorization

- New permission: `workspace.conversation.handoff` (`CONVERSATION_HANDOFF`) for take/release.
- Granted to: `owner`, `admin`, `operator`, `human_agent`.

### API (staff, via gateway)

- `POST /v1/workspaces/:workspaceId/conversations/:conversationId/take`
- `POST /v1/workspaces/:workspaceId/conversations/:conversationId/release`
- `GET /v1/workspaces/:workspaceId/conversations?state=&limit=` (filter by state)

## Consequences

- Inbox and runtime share one row; no second message store.
- Widget turns fail while human owns thread (visitor can still be handled in 18b if we allow user-only append).
- Feature 19 can emit `conversation.handed_off` later from the same commit boundary.
