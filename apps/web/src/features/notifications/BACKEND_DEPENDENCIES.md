# Feature F12 — Notification Center Backend Dependencies & API Capability Boundary

This document records the backend capabilities and schema contracts implemented for workspace notifications.

---

## 1. Implementation Status

- **Status:** **IMPLEMENTED & CONNECTED**
- **Owning Service:** `services/workspace-service` (:3012)
- **Database Schema:** `services/workspace-service/migrations/004_workspace_notifications.sql`
- **Gateway Proxy:** `services/api-gateway/src/routes/proxy-workspace.routes.ts`
- **Web BFF Routes:**
  - `GET /api/workspaces/:workspaceId/notifications` -> `apps/web/src/app/api/workspaces/[workspaceId]/notifications/route.ts`
  - `GET /api/workspaces/:workspaceId/notifications/unread-count` -> `apps/web/src/app/api/workspaces/[workspaceId]/notifications/[...path]/route.ts`
  - `POST /api/workspaces/:workspaceId/notifications/:id/read` -> `apps/web/src/app/api/workspaces/[workspaceId]/notifications/[...path]/route.ts`
  - `POST /api/workspaces/:workspaceId/notifications/read-all` -> `apps/web/src/app/api/workspaces/[workspaceId]/notifications/[...path]/route.ts`
  - `POST /api/workspaces/:workspaceId/notifications/dismiss-read` -> `apps/web/src/app/api/workspaces/[workspaceId]/notifications/[...path]/route.ts`
- **Frontend Components:**
  - Notification Center View: `apps/web/src/features/notifications/components/notification-center.tsx`
  - Bell Icon Popover & Mobile Bottom Sheet: `apps/web/src/features/notifications/components/notification-bell.tsx`
  - Shared State Context: `apps/web/src/features/notifications/components/notifications-context.tsx`

---

## 2. API Endpoints

### `GET /v1/workspaces/:workspaceId/notifications`
- **Query Parameters:**
  - `category` (`string`, optional): Filter by `all`, `security`, `billing`, `system`, or `team`.
  - `unreadOnly` (`boolean`, optional): When `true`, returns only unread items.
  - `limit` (`number`, optional, default 50).
- **Response Contract:**
  ```json
  {
    "notifications": [
      {
        "id": "notif_01j8...",
        "workspace_id": "...",
        "recipient_user_id": null,
        "category": "security",
        "severity": "warning",
        "type": "unauthorized_attempt",
        "title": "Multiple failed sign-in attempts",
        "description": "5 failed attempts detected from IP 192.0.2.1",
        "source": {
          "type": "audit",
          "id": "sec-1",
          "name": "Security Watcher"
        },
        "action_url": "/security/audit",
        "action_label": "Inspect audit log",
        "read_at": null,
        "dismissed_at": null,
        "created_at": "2026-10-18T10:00:00.000Z"
      }
    ],
    "unread_count": 3,
    "total": 12
  }
  ```

### `GET /v1/workspaces/:workspaceId/notifications/unread-count`
- Highly optimized index query returning `{ "unread_count": number }` for periodic 30s background polling without table scans.

### `POST /v1/workspaces/:workspaceId/notifications/:notificationId/read`
- Marks the specified notification with timestamp `read_at = now()`.

### `POST /v1/workspaces/:workspaceId/notifications/read-all`
- **Body:** `{ "category": "security" }` (optional). Marks all unread notifications in scope as read.

### `POST /v1/workspaces/:workspaceId/notifications/dismiss-read`
- **Body:** `{ "category": "all" }` (optional). Sets `dismissed_at = now()` on already-read notifications.

---

## 3. Deduplication & Delivery Model

- **Deduplication:** Postgres unique constraint on `(workspace_id, dedup_key) WHERE dedup_key IS NOT NULL` prevents noisy repetitive notifications.
- **Tenant Isolation:** Enforces workspace UUID scoping on all reads and state mutations.
