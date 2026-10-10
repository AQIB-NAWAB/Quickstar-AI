# ADR 0017 — Website widget and publishable keys

## Status

Accepted

## Context

Feature 17 needs an embeddable browser client that talks only to the public gateway. Visitors have no staff JWT and no workspace membership. Secret org API keys must never ship in JavaScript.

## Decision

1. **Publishable keys** are workspace-scoped, stored in **workspace-service**, hashed at rest (SHA-256), shown in full only once at creation. Prefix `pk_live_`.
2. **Origin allow-list** is stored on each key as a JSON array of full origins (scheme + host + port), e.g. `http://127.0.0.1:8080`. Gateway rejects widget calls when `Origin` (or `Referer` parsed to origin) is not listed.
3. Widget clients send **`X-Publishable-Key`**. Gateway resolves the key via workspace **internal** API (`POST /internal/publishable-keys/resolve`) using a shared internal bearer token.
4. **Public gateway routes** live under `/v1/public/widget/...` with no JWT. Workspace id comes only from resolved key metadata, never from an untrusted client body field alone.
5. **Conversation and runtime** expose **`/internal/workspaces/:workspaceId/widget/...`** routes authenticated with the same internal token family as other services (`INTERNAL_TOKEN` in local dev). These skip staff RBAC but enforce workspace id in the URL against stored rows (IDOR guards unchanged).
6. **Agent reads** for widget turns use **`/internal/workspaces/:workspaceId/agents/...`** on agent-service with internal token so runtime does not need a staff JWT.
7. **Transport v1** is request/response JSON for turns (non-stream). SSE streaming is a follow-up slice on the same routes.

## Consequences

- Gateway must call upstream with `Authorization: Bearer <INTERNAL_TOKEN>` and must not forward browser `Authorization` on widget routes.
- Tools on published agents are rejected for widget turns until tool execution is defined for anonymous visitors.
- At scale, key resolve should be cached in Redis; v1 resolves on each request.
