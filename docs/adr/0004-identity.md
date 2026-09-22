# ADR 0004: Identity service

- **Status:** Accepted
- **Date:** 2026-09-22
- **Slot:** 04 — Identity

## Context

QuickStart AI is multi-tenant (§12–13 in `project_details.md`). Slot 03 provides platform libraries and an internal `AuthContext` header stub; **no real users or credentials** exist yet. Slot 04 introduces **`services/identity-service`** (`@quickstart/service-identity`) as the bounded context for authentication, organization membership, and org-scoped API keys.

Workspace RBAC, gateway JWT validation, and SSO remain later slots (05–06).

## Decision

### Service boundary

| Owns                                                      | Does not own                                             |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Users, password verify, register/login                    | Workspace invites, permission strings (Slot 05)          |
| Organizations and **org memberships** (`owner`, `member`) | Agent-scoped keys                                        |
| Access JWT + refresh token lifecycle                      | Public gateway rate limits (Slot 06)                     |
| Org API keys (hash at rest, show once)                    | Full audit service (minimal hooks via logs only for now) |

Other services must not query identity tables directly. They trust **validated tokens** (gateway in Slot 06) or call identity HTTP APIs.

### Tenancy model (aligned with §12)

```text
Organization  →  billing / legal root; org membership; org API keys
Workspace     →  Slot 05; invites and RBAC live there
```

Access JWT includes **`org_id`** for the user’s current organization context (default: first org at register/login). **`tenantId` in `AuthContext` becomes workspace id after Slot 05**; until then gateway may map `org_id` for org-scoped routes only.

### Session model

- **Access token:** signed JWT (HS256), short TTL (`JWT_ACCESS_TTL_SECONDS`, default 15m). Claims: `sub` (user id), `org_id`, `sid` (session id).
- **Refresh token:** opaque random, **SHA-256 hash** stored in Postgres; metadata in `refresh_tokens` with **rotation** on each refresh.
- **Revocation:** Redis key `identity:session:revoked:{sid}` with TTL aligned to refresh lifetime. Logout and refresh reuse detection set this key.

Signing secret: `JWT_ACCESS_SECRET` (local `.env`; production **AWS Secrets Manager + KMS**, dual-key rotation — see § Production secrets).

### API keys

- Format: `qs_live_{random}`; store **prefix** (lookup) + **hash** only.
- Raw key returned **once** on create.
- Revoke via `DELETE`; no in-place rotation.

### Passwords

- **scrypt** (Node `crypto.scrypt`) with per-user salt; no custom crypto algorithms.

### Storage

- **Postgres:** users, organizations, org_memberships, refresh_tokens, api_keys, schema_migrations.
- **Valkey/Redis:** session revocation flags (Slot 02 data plane).

### HTTP surface (v1)

| Method | Path                                       | Auth                   |
| ------ | ------------------------------------------ | ---------------------- |
| POST   | `/v1/register`                             | —                      |
| POST   | `/v1/login`                                | —                      |
| POST   | `/v1/refresh`                              | body refresh_token     |
| POST   | `/v1/logout`                               | Bearer or refresh body |
| GET    | `/v1/me`                                   | Bearer                 |
| GET    | `/v1/organizations`                        | Bearer                 |
| GET    | `/v1/organizations/:orgId`                 | Bearer (member)        |
| POST   | `/v1/organizations/:orgId/api-keys`        | Bearer (member+)       |
| DELETE | `/v1/organizations/:orgId/api-keys/:keyId` | Bearer (member+)       |
| GET    | `/healthz`                                 | —                      |

Errors use `@quickstart/errors` envelope. Requests use `@quickstart/tracing` + structured logs (no passwords/tokens in logs).

## Production secrets and incidents

| Secret              | Dev     | Production                                                    |
| ------------------- | ------- | ------------------------------------------------------------- |
| `JWT_ACCESS_SECRET` | `.env`  | Secrets Manager; rotate with two active `kid`s during overlap |
| DB URL              | Compose | RDS + Secrets Manager; RDS Proxy                              |
| Redis URL           | Compose | ElastiCache                                                   |

**Incident (key or token leak):** rotate JWT secret → deploy → set global session revocation pattern or per-user revoke in Redis → invalidate refresh rows → audit via logs/`request_id` → re-issue API keys for affected orgs.

## Consequences

- `packages/auth` exports JWT sign/verify helpers for identity now and gateway later.
- **Schema changes are explicit:** run `make identity-migrate` or `pnpm --filter @quickstart/service-identity migrate` — not on HTTP server startup. See [database migrations](../architecture/database-migrations.md).
- Integration tests against Postgres are optional (`IDENTITY_INTEGRATION_TEST=1`).

## Alternatives rejected

| Alternative                          | Why not                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| Auth0-only                           | Weak fit for org API keys, service identity, and learning goals |
| JWT-only sessions (no refresh store) | No revocation without denylist; poor incident response          |
| Store API keys plaintext             | Backup leak = full compromise                                   |

## References

- `docs/project_details.md` — §12–13, §19, §47–48
- `docs/roadmap.md` — Slot 04
- `docs/security/identity-threats.md`
- `docs/architecture/database-migrations.md`
