# Feature F12 — Notification Center Backend Dependencies & API Capability Boundary

This document records the backend capabilities and schema contracts required for workspace notifications.

---

## 1. Notification Feed & Aggregates
- **Feed API:** `GET /v1/workspaces/:id/notifications` returning notifications with `id`, `type`, `title`, `description`, `source`, `created_at`, `read_at`.
- **Fast Unread Counter:** `GET /v1/workspaces/:id/notifications/unread-count` optimized for lightweight 30-second polling without table scans.

---

## 2. Read State Mutations
- **Individual Mark-Read:** `POST /v1/workspaces/:id/notifications/:id/read` marking the notification with timestamp `read_at`.
- **Mark-All-Read:** `POST /v1/workspaces/:id/notifications/read-all` updating unread notifications in the caller's scope up to the current instant without race conditions on newly arriving events.

---

## 3. Real-Time Transport & Channels
- **WebSocket / SSE Feed:** Real-time push of urgent alerts (e.g. campaign provider errors, ingestion crashes, quota alerts) directly into the client context.
- **Delivery Scope:** Workspace-wide notifications vs user-specific assignment alerts.
