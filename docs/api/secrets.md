# Secrets API

**Service:** `secrets-service` (port 3011)  
**Base path via gateway:** `/v1/workspaces/:workspaceId/secrets`  
**Auth:** JWT Bearer token (forwarded by gateway) + workspace membership check  
**Permissions:** `workspace.secret.read` (list) / `workspace.secret.write` (create, rotate, delete)

> **Security note:** No public API endpoint ever returns the raw secret value or ciphertext. Values are stored encrypted at rest with AES-256-GCM. See [ADR 0016](../adr/0016-secrets.md).

---

## Endpoints

### List secrets (names only)

```
GET /v1/workspaces/:workspaceId/secrets
```

**Response 200:**
```json
{
  "request_id": "uuid",
  "secrets": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "OPENAI_KEY",
      "key_version": 1,
      "created_at": "2026-09-30T12:00:00Z",
      "updated_at": "2026-09-30T12:00:00Z"
    }
  ],
  "total": 1
}
```

> Note: `ciphertext` and `value` are never included.

---

### Create or overwrite a secret

```
POST /v1/workspaces/:workspaceId/secrets
```

**Request body:**
```json
{
  "name": "OPENAI_KEY",
  "value": "sk-live-..."
}
```

**Constraints:**
- `name`: 1–128 characters, `[a-zA-Z0-9_.\-/]+`
- `value`: 1–8192 bytes

**Response 201:**
```json
{
  "request_id": "uuid",
  "secret": {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "OPENAI_KEY",
    "key_version": 1,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

> Creating with an existing name overwrites the ciphertext (upsert).

---

### Rotate encryption (re-encrypt with new key)

```
PUT /v1/workspaces/:workspaceId/secrets/:name/rotate
```

Decrypts the current ciphertext with the running service's key and re-encrypts it. Used after rotating `ENCRYPTION_KEY` + bumping `ENCRYPTION_KEY_VERSION` in deployment config.

**Response 200:**
```json
{
  "request_id": "uuid",
  "secret": { "id": "...", "name": "OPENAI_KEY", "key_version": 2, ... }
}
```

---

### Delete a secret

```
DELETE /v1/workspaces/:workspaceId/secrets/:name
```

**Response 200:**
```json
{ "request_id": "uuid", "deleted": true }
```

Returns `404` if the secret does not exist in this workspace.

---

## Internal endpoint (runtime / tools path)

> **Not accessible via gateway.** Called by `runtime-service` and `tool-executor` with the shared `SECRETS_INTERNAL_TOKEN`.

```
GET /internal/workspaces/:workspaceId/secrets/:name/value
Authorization: Bearer <SECRETS_INTERNAL_TOKEN>
```

**Response 200:**
```json
{ "request_id": "uuid", "value": "sk-live-..." }
```

Returns `404` if secret not found.  
Returns `401` if internal token is missing or invalid.
