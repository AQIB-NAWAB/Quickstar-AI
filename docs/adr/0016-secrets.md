# ADR 0016 — Feature 16: Secrets Vault with Envelope Encryption

**Status:** Accepted  
**Date:** 2026-09-30  
**Author:** @hashirsajid58200p  

---

## Context

As of Feature 15, agent tool definitions reference external API keys (Stripe, HubSpot, custom HTTP endpoints). There is no safe storage mechanism for these credentials. Without one, customers paste raw API keys into agent instructions or tool config — both of which appear in logs, prompt traces, and audit exports.

The platform serves 10,000+ workspaces. Per-workspace env vars do not scale. A plaintext credentials column is a compliance blocker.

## Decision

Implement a **secrets vault** as a standalone microservice (`services/secrets-service`, port 3011) backed by Postgres.

### Encryption: AES-256-GCM Envelope Encryption

| Property | Value |
|---|---|
| Algorithm | AES-256-GCM |
| IV length | 96 bits (12 bytes), random per encrypt call |
| Auth tag | 128 bits (16 bytes) |
| Stored format | `base64(IV ‖ authTag ‖ ciphertext)` |
| Key source | `ENCRYPTION_KEY` env var (64-char hex = 32 bytes) |
| Key version | `ENCRYPTION_KEY_VERSION` integer in env + stored per row |

**Why AES-256-GCM:**  
Authenticated encryption — a tampered ciphertext throws on decrypt (auth tag mismatch). No separate HMAC step needed. Standard Node.js `node:crypto` implementation; no third-party crypto dependency.

**Why envelope, not per-row keys:**  
At 10,000 workspaces, managing a KMS-derived data-key per row adds latency and cost before we have KMS. The master key from env is the envelope key now; KMS becomes a drop-in replacement for the `ENCRYPTION_KEY` source without changing the Postgres schema or application decrypt logic.

### Redaction Policy

| Surface | Rule |
|---|---|
| `GET /secrets` (list) | Returns `id`, `name`, `key_version`, timestamps. Never `ciphertext`, never `value`. |
| Error messages | Must not repeat secret name in body if NOT_FOUND — only `"not found"`. |
| Application logs | Log `secret.created`, `secret.deleted`, `secret.rotated` with `name` only. No values. |
| Internal reveal | Only callable via `SECRETS_INTERNAL_TOKEN`; returns `{ value }` for the runtime/tools path. |

### Rotation Strategy

Rotation is non-destructive:

1. Generate new `ENCRYPTION_KEY` and increment `ENCRYPTION_KEY_VERSION` in deployment env.
2. Deploy new service replicas (they start with new key).
3. Call `PUT /v1/workspaces/:id/secrets/:name/rotate` per secret.
   - Old service instances (still running during rolling deploy) read ciphertext with old key.
   - New instances decrypt old ciphertext with old key passed explicitly to `service.rotate()`, then write new ciphertext.
4. After all rows rotated, remove old key from env.

The old row is **never deleted before** the new row is confirmed written. A failed rotate does not corrupt the existing row.

### `subject_key` boundary (tenant isolation)

Every Postgres query includes `workspace_id` as a hard filter. The repository's `listNames` and `getByName` methods enforce this at the SQL level. The service returns `NOT_FOUND` (404) — not `FORBIDDEN` (403) — for cross-workspace access. Confirming a resource exists but is forbidden would leak workspace ID surface area.

## Consequences

- **Good:** Plaintext values never touch Postgres, never appear in logs, never appear in public API responses.
- **Good:** Node.js built-in crypto — no third-party crypto library to audit or update.
- **Good:** KMS migration is env-only; no schema change required.
- **Neutral:** Rotation requires an explicit API call per secret. A background rotation job is a future task.
- **Risk (documented):** Local dev uses a static `ENCRYPTION_KEY` from `.env`. This is documented as dev-only. Production environments must use a proper secret manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) to inject `ENCRYPTION_KEY`.

## Rejected Alternatives

| Alternative | Reason rejected |
|---|---|
| Per-row KMS data keys | Latency + cost before cloud infra is set up; adds external dependency for local dev |
| Plaintext column with column-level access control | No protection against log leaks or backup exposure |
| HashiCorp Vault | Operational overhead; hides application-level redaction, which still needs to exist |
| Storing secrets in Memory service `fact_text` | Explicitly listed in memory service denylist (ADR 0014 intent) |
