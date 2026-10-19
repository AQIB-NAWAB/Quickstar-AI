# Developer Portal & Webhooks — Backend Dependencies & API Contracts

This document records the backend capabilities, contracts, and schema boundaries implemented for the Developer Portal, Interactive API Reference, Try-It Console, and Webhooks Management.

---

## 1. Implementation Status

- **Status:** **IMPLEMENTED & CONNECTED**
- **Owning Service:** `services/workspace-service` (:3012)
- **Database Schema:** `services/workspace-service/migrations/005_webhook_subscriptions_and_deliveries.sql`
- **Gateway Proxy:** `services/api-gateway/src/routes/proxy-workspace.routes.ts`
- **Web BFF Routes:**
  - `GET/POST /api/workspaces/:workspaceId/webhooks` -> `apps/web/src/app/api/workspaces/[workspaceId]/webhooks/route.ts`
  - `PATCH/DELETE .../webhooks/:endpointId` -> `apps/web/src/app/api/workspaces/[workspaceId]/webhooks/[...path]/route.ts`
  - `POST .../webhooks/:endpointId/rotate-secret` -> `.../[...path]/route.ts`
  - `GET .../webhooks/:endpointId/deliveries` -> `.../[...path]/route.ts`
  - `GET .../webhooks/:endpointId/deliveries/:deliveryId` -> `.../[...path]/route.ts`
  - `POST .../webhooks/:endpointId/deliveries/:deliveryId/redrive` -> `.../[...path]/route.ts`
- **Frontend Components:**
  - API Reference 3-Column Layout & Try-It Console: `apps/web/src/features/developer/components/api-reference.tsx`
  - Webhooks Directory: `apps/web/src/features/developer/components/webhook-list.tsx`
  - Delivery Inspection Drawer: `apps/web/src/features/developer/components/delivery-detail.tsx`
  - Webhook Registration Modal: `apps/web/src/features/developer/components/webhook-registration.tsx`
  - Signing Secret Dialog: `apps/web/src/features/developer/components/signing-secret-dialog.tsx`
  - Redrive Confirmation Dialog: `apps/web/src/features/developer/components/redrive-dialog.tsx`

---

## 2. Webhooks API Specification

### Endpoint Management
- `GET /v1/workspaces/:workspaceId/webhooks`: Lists registered endpoints with status, last delivery outcome, consecutive failure count.
- `POST /v1/workspaces/:workspaceId/webhooks`: Registers endpoint. Validates URL protocol & SSRF restrictions. Generates cryptographic `whsec_live_` secret returned once.
- `PATCH /v1/workspaces/:workspaceId/webhooks/:endpointId`: Modifies URL, subscribed events, or status (`active`, `disabled`).
- `DELETE /v1/workspaces/:workspaceId/webhooks/:endpointId`: Removes endpoint and cancels active retries.
- `POST /v1/workspaces/:workspaceId/webhooks/:endpointId/rotate-secret`: Rotates signing secret, returning newly generated secret.

### Delivery History & Redrive
- `GET /v1/workspaces/:workspaceId/webhooks/:endpointId/deliveries`: Lists recent deliveries with HTTP status, latency, error reason.
- `GET /v1/workspaces/:workspaceId/webhooks/:endpointId/deliveries/:deliveryId`: Returns complete delivery trace including request headers, payload, response headers, body snippet, and attempt history.
- `POST /v1/workspaces/:workspaceId/webhooks/:endpointId/deliveries/:deliveryId/redrive`: Re-executes delivery with incremented attempt counter and HMAC signature generation.

---

## 3. Cryptographic Signature & SSRF Defense

- **HMAC Scheme:** Stripe-compatible timestamped header `X-QuickStart-Signature: t={timestamp},v1={hmacSha256(secret, `${timestamp}.${rawBody}`)}`.
- **SSRF Defense:** In production, rejects private network blocks (`127.0.0.1`, `localhost`, `::1`, `10.0.0.0/8`, `192.168.0.0/16`, AWS metadata `169.254.169.254`) and enforces HTTPS.

---

## 4. Interactive API Reference & Try-It Console

- **Catalog:** `apps/web/src/features/developer/lib/openapi.ts` contains structured operations for Workspace, Agents, Conversations, Knowledge, Webhooks, Analytics, and Audit.
- **Safety Boundary:** In-memory Bearer token state, interactive parameter and body editors, and modal confirmation guards for state-altering requests (`POST`, `PATCH`, `DELETE`).
