# ADR 0027 — Audit trail (audit-service)

## Status

Accepted

## Context

Sensitive staff writes (agent publish, member role change, secret create/delete, publishable and org API key create/revoke) have no listable append-only trail. Logs rotate and may contain bodies. Feature 27 needs app-level audit before CloudTrail exists.

## Decision

1. **`services/audit-service` (port 3018)** owns Postgres table `audit_entries` (migration) and staff `GET /v1/workspaces/:workspaceId/audit`.
2. **Same-transaction writes:** owning services insert into `audit_entries` inside the same Postgres transaction as the sensitive change (shared DB). Not fire-and-forget like usage-service.
3. **Failure policy (fail closed):** if the audit insert fails, the user request fails and the transaction rolls back. Stated here so humans can confirm.
4. **Redaction:** metadata never stores secret values, ciphertext, raw API keys, passwords, or full prompts — only ids, names, roles, key prefixes, version ids.
5. **Permission:** `workspace.audit.read` (owner/admin/developer/analyst).
6. **List API:** always filter by `workspace_id`; require/default a time range (default last 7 days, max 90 days).
7. **Not in this slice:** SIEM export, WORM/immutable storage, notification center, CSV export polish.

## Consequences

- Gateway proxies `/v1/workspaces/:id/audit` to audit-service.
- Writers depend on `@quickstart/audit-writer` (thin SQL insert) used with Pool client or TypeORM `manager.query` in-TX.
- Proof: `scripts/check-audit-proof.mjs`.

## Scale / still unsafe

Honest: rows are append-only in application code; a database admin can still delete them. No SIEM, no WORM.
