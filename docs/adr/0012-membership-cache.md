# ADR 0012 — Workspace membership Redis cache (Feature 09B)

## Status

Accepted

## Context

Agent, conversation, knowledge, and future runtime-adjacent services resolve the caller's workspace role by HTTP to workspace-service on many requests. At scale this hop dominates latency and workspace load.

## Decision

- Cache key: `qs:membership:v1:{workspaceId}:{userId}` in Valkey/Redis.
- Value: JSON `MembershipSnapshot` (`role`, `cached_at`, optional `deny` for negative cache).
- Positive TTL: 60 seconds default (`MEMBERSHIP_CACHE_TTL_SEC`, allowed 30–120).
- Negative TTL: 30 seconds when workspace returns forbidden/not-member.
- **Redis unavailable:** fall back to HTTP workspace check (log `membership.cache_degraded`); do not fail closed on laptop/dev.
- **Revocation:** workspace-service deletes cache key on member role change and member remove.
- Shared package: `@quickstart/workspace-access` (`HttpWorkspaceAccessClient` + `createCachedWorkspaceAccessClient`).

## Consequences

- Removed members may retain access for up to TTL if invalidation fails; invalidation is required on write paths.
- Gateway verifies workspace membership (cached HTTP to workspace-service) on `/v1/workspaces/:workspaceId/*` proxy routes; services still enforce RBAC for permissions.
- Widget end-user sessions are out of scope.
