# Leads Management Backend Dependencies (Feature F7 / Feature 24)

Staff leads UI talks to **lead-service** via BFF → gateway. Feature 24 shipped the flexible store; this doc tracks what is wired vs still open.

> Types in `lib/types.ts` are frontend view models. API responses use snake_case; the client maps them.

---

## 1. Workspace-Scoped Lead List & Detail — **shipped**

- `GET /v1/workspaces/:workspaceId/leads` — list with `q`, `status`, `tag`; returns `total` (workspace-filtered count), `limit`, `lead_schema`, `attribute_labels`.
- `GET /v1/workspaces/:workspaceId/leads/:leadId` — detail + `captured_fields`, `conversation_id`, `lead_schema`, `attribute_labels`.
- `POST /v1/workspaces/:workspaceId/leads/:leadId/status` — status transition with `expected_version`.
- Permissions: `workspace.lead.read|create|edit`.

Thin first-class columns: name, email, phone, status, source, tags, intent, qualification_*, sentiment, conversation_id, external_id, idempotency_key, notes. Extras live in `captured_fields` JSONB.

---

## 2. Flexible schema-as-data — **shipped**

- `GET/PUT /v1/workspaces/:workspaceId/leads/schema` — workspace `lead_schema` (roles: identity | contact_email | contact_phone | custom).
- New customer fields = schema + JSON attributes; **never** `ALTER TABLE`.
- UI `CapturedFields` uses `attribute_labels` for display; denorm columns stay for the table.

---

## 3. Idempotent upsert — **shipped**

- Unique `(workspace_id, idempotency_key)` and `(workspace_id, external_id)` when set.
- Internal: `POST /internal/v1/workspaces/:workspaceId/leads/upsert` (bot bearer).
- `merge_on_conflict` deep-merges `captured_fields` with size caps.

---

## 4. Search / filter honesty — **partial**

- Server filters: `q`, `status`, `tag`.
- `total` is the filtered workspace count (not a cross-tenant leak). Cursor pagination still open; list is capped (`limit` ≤ 200).

---

## 5. Still open (not Feature 24)

- Cursor pagination (`cursor` / `nextCursor`) for very large workspaces.
- Qualification score provenance / scoring model.
- Transcript read from conversation-service on the lead detail (currently `transcript_status: unavailable`).
- Export CSV job + `leads:export` RBAC.
- CRM sync and `lead.*` outbox emission.
