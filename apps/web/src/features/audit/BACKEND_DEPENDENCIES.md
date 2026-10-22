# Feature F12 — Audit Log Backend Dependencies & API Capability Boundary

This document records the backend capabilities, contracts, and schema boundaries implemented for workspace audit logging and forensic investigation.

---

## 1. Implementation Status

- **Status:** **IMPLEMENTED & CONNECTED**
- **Owning Service:** `services/audit-service` (:3018)
- **Database Schema:** `services/audit-service/migrations/001_audit.sql` and `002_audit_search_and_changes.sql`
- **Gateway Proxy:** `services/api-gateway/src/routes/proxy-audit.routes.ts`
- **Web BFF Routes:**
  - `GET /api/workspaces/:workspaceId/audit` -> `apps/web/src/app/api/workspaces/[workspaceId]/audit/route.ts`
  - `GET /api/workspaces/:workspaceId/audit/:entryId` -> `apps/web/src/app/api/workspaces/[workspaceId]/audit/[entryId]/route.ts`
  - `GET /api/workspaces/:workspaceId/audit/export` -> `apps/web/src/app/api/workspaces/[workspaceId]/audit/export/route.ts` (binary streaming proxy)
- **Frontend Components:**
  - Audit Trail Table: `apps/web/src/features/audit/components/audit-list.tsx`
  - Change Detail Drawer: `apps/web/src/features/audit/components/audit-entry-detail.tsx`
  - CSV Export Dialog: `apps/web/src/features/audit/components/audit-csv-export-dialog.tsx`

---

## 2. API Endpoints

### `GET /v1/workspaces/:workspaceId/audit`
- **Query Parameters:**
  - `from` (`string`, optional, default 7 days ago): Start timestamp.
  - `to` (`string`, optional, default now): End timestamp. Max range 90 days.
  - `action` (`string`, optional): Exact action filter (e.g. `agent.published`, `secret.rotated`).
  - `actor` (`string`, optional): Actor user ID filter.
  - `q` (`string`, optional): Full-text search across action, actor name, email, target type, target ID, and origin IP.
  - `cursor` (`string`, optional): ISO timestamp cursor for pagination.
  - `limit` (`number`, optional, default 50, max 200).
- **Response:**
  ```json
  {
    "entries": [
      {
        "id": "aud_01j7...",
        "workspace_id": "...",
        "actor_user_id": "...",
        "actor_name": "Sarah Chen",
        "actor_email": "sarah@example.com",
        "actor_role": "Workspace Admin",
        "action": "agent.published",
        "target_type": "agent",
        "target_id": "ag_123",
        "request_id": "req_abc",
        "origin_ip": "192.0.2.1",
        "country_code": "US",
        "city": "San Francisco",
        "user_agent": "Mozilla/5.0 ...",
        "changes": {
          "status": { "old": "draft", "new": "published" },
          "version": { "old": 1, "new": 2 }
        },
        "metadata": {},
        "created_at": "2026-10-18T14:32:00.000Z"
      }
    ],
    "next_cursor": null,
    "total": 1
  }
  ```

### `GET /v1/workspaces/:workspaceId/audit/:entryId`
- Returns complete `AuditEntry` by ID with full changes snapshot and forensic metadata.
- Fails closed with 404 on cross-workspace IDOR access.

### `GET /v1/workspaces/:workspaceId/audit/export`
- Exports up to 10,000 audit records as streaming RFC-4180 CSV.
- **Security Protections:**
  - Neutralizes CSV Formula Injection (DDE attacks) by prepending a single quote (`'`) to any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r`.
  - Prepends UTF-8 Byte Order Mark (`\uFEFF`) for seamless Excel / Numbers compatibility.
  - Sets `Content-Disposition: attachment; filename="audit-{workspaceId}-{from}-{to}.csv"`.

---

## 3. Append-Only Tenancy & Redaction Guarantees

- **Tamper Resistance:** No UPDATE or DELETE routes are exposed. Audit logs are append-only.
- **Zero-Secret Guarantee:** Secrets, raw passwords, authentication tokens, and ciphertexts are strictly filtered server-side prior to insertion.
