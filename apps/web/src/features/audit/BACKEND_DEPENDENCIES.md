# Feature F12 — Audit Log Backend Dependencies & API Capability Boundary

This document records the backend capabilities, contracts, and schema boundaries required for workspace audit logging.

---

## 1. Append-Only Audit Trail Contracts
- **Append-Only Store:** Append-only database table or dedicated audit log store (e.g., ClickHouse, OpenSearch, or immutable Postgres partition).
- **No Mutation / No Hard Delete:** Enforce at database engine / schema level that `UPDATE` and `DELETE` commands are revoked from the service role on audit tables.

---

## 2. Actor & Action Catalogs
- **Actor Taxonomy:**
  - `user`: authenticated team member with `id`, `name`, `email`.
  - `system`: automated background workers, cron schedulers, or data pipelines.
  - `service`: API key or integration token with `service_id`.
- **Action Identifier Standard:** Structured dot-separated action taxonomy (`agent.published`, `member.role_updated`, `secret.rotated`, `knowledge.ingest_failed`, `workspace.updated`).

---

## 3. Metadata & Before/After Snapshots
- **Change Sets:** Granular recording of pre-modification state (`before`) and post-modification state (`after`).
- **Sensitive Data Redaction:** Authoritative server-side redaction of secrets, tokens, raw passwords, or private user payload data before writing to the audit stream.
- **Request Tracing:** Correlation of every entry to upstream gateway `request_id` / trace context.

---

## 4. Cursor Pagination & Export
- **Opaque Cursors:** Base64 cursor pagination (`next_cursor`, `prev_cursor`) for scrolling through thousands of audit entries.
- **Bulk Export Authorization:** Endpoint `GET /v1/workspaces/:id/audit/export` with stream or signed download link for exporting full ranges beyond the client-side slice.
