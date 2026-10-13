# Feature F12 — Audit Log Backend Dependencies & API Capability Boundary

This document records the backend capabilities, contracts, and schema boundaries required for workspace audit logging.

---

## 1. Current Working Tree Status (Feature 27)

As of Feature 27 (audit trail):
- **Ledger shipped:** `audit-service` (:3018) owns append-only `audit_entries`. Writers insert in the **same Postgres transaction** as the sensitive change (fail closed).
- **Staff list:** `GET /v1/workspaces/:workspaceId/audit` (permission `workspace.audit.read`) via gateway — time range defaulted/capped, workspace filter always applied.
- **Actions audited (v1):** `agent.published`, `member.role_updated`, `secret.created` / `secret.updated` / `secret.deleted` / `secret.rotated`, `publishable_key.created` / `publishable_key.revoked`, `api_key.created` / `api_key.revoked` (org-scoped).
- **Redaction:** metadata never stores secret values, ciphertext, raw API keys, or prompts.
- **Still open for F12 UI:** CSV export endpoint, notification center / unread badge, rich before/after diffs, actor name/avatar join.

---

## 2. Append-Only Audit Trail Contracts
- **Append-Only Store:** Postgres `audit_entries` (application append-only; DB admin can still delete — no WORM in v1).
- **No Mutation / No Hard Delete:** Service does not expose UPDATE/DELETE for audit rows.

---

## 3. Actor & Action Catalogs
- **Actor:** `actor_user_id` on each row (staff JWT `sub`).
- **Action Identifier Standard:** Structured dot-separated action taxonomy (`agent.published`, `member.role_updated`, `secret.rotated`, …).

---

## 4. Metadata & Before/After Snapshots
- **Change Sets:** Role updates store `previous_role` / `new_role` in metadata. Full before/after JSON blobs are not required for v1.
- **Sensitive Data Redaction:** Authoritative server-side redaction — never write secrets, tokens, passwords, or private payloads.
- **Request Tracing:** Every entry stores gateway `request_id`.

---

## 5. Cursor Pagination & Export
- **Opaque Cursors:** List returns `next_cursor` (created_at of last row) for scrolling.
- **Bulk Export:** `GET /v1/workspaces/:id/audit/export` still open (CSV later).
