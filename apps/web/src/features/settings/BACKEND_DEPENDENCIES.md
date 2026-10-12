# Workspace Settings UI — Backend Dependencies & Limitations

This document captures the concrete backend API contracts and persistence limitations currently existing across `workspace-service`, `identity-service`, and `secrets-service`. The frontend UI in `apps/web/src/features/settings/` enforces honest presentation states and disables unsupported actions.

---

## 1. Workspace Description & Logo Upload
* **Status:** Unavailable
* **Current Reality:** `services/workspace-service/src/controllers/workspaces.controller.ts` only persists `name` and `slug`.
* **Missing Contracts:**
  * No `description` column in the workspaces table schema.
  * No multipart file upload or S3 asset bucket configured for workspace brand avatars/logos.

---

## 2. Organization API Key Last-Four Suffix
* **Status:** Unavailable in List Endpoint
* **Current Reality:** `services/identity-service/src/services/api-keys.service.ts` stores only `keyPrefix` and `keyHash`. The list endpoint returns `key_prefix` (e.g. `qsk_live_`) and does not store or return the actual last four characters of the key.
* **Frontend Behavior:** Displays `••••` with an unobtrusive note: "Last four unavailable".
* **Missing Contract:** A dedicated `last_four` string column (e.g. `8f2a`) populated during key creation so users can identify keys safely without revealing secret material.

---

## 3. Member Directory Profile Names & Emails
* **Status:** Limited
* **Current Reality:** `services/workspace-service/src/controllers/members.controller.ts` lists membership rows from the `workspace_members` table, which stores only `{ id, workspace_id, userId, role, created_at }`.
* **Frontend Behavior:** The currently logged-in user is identified via the active session email and labeled "You". Other members display their monospace `userId`.
* **Missing Contract:** An internal or gateway join with `identity-service` to include `email` and `display_name` in member list responses.

---

## 4. Invite Email Delivery & Acceptance URL
* **Status:** Token Only
* **Current Reality:** `services/workspace-service/src/services/members.service.ts` creates an invite record with `tokenHash` and returns `raw_token`. It does not send transactional emails (no SMTP or SES provider wired) and does not generate a public acceptance web route.
* **Frontend Behavior:** Confirms "Invite created" and offers a one-time "Copy invite token" modal for manual delivery.

---

## 5. Secret Rotation Scope
* **Status:** Re-encryption Only
* **Current Reality:** `PUT /v1/workspaces/:workspaceId/secrets/:name/rotate` in `secrets-service` decrypts the existing ciphertext with the current service key and re-encrypts it (refreshing the initialization vector or moving to a new key version). It does not communicate with third-party providers (OpenAI, Stripe, etc.) to rotate credentials.
* **Frontend Behavior:** Dialog accurately describes the action: "Re-encrypt the stored secret using the vault's configured encryption key. The secret value is unchanged."
